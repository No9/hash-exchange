var multiplex = require('multiplex');
var inherits = require('inherits');
var Duplex = require('readable-stream').Duplex;
var protobuf = require('protocol-buffers');
var fs = require('fs');
var through = require('through2');

var messages = protobuf(fs.readFileSync(__dirname + '/schema.proto'));
var TYPE = messages.TYPE;
var RPC = messages.RPC;

module.exports = Rep;
inherits(Rep, Duplex);

function Rep (fn) {
    var self = this;
    if (!(this instanceof Rep)) return new Rep(fn);
    Duplex.call(this);
    
    this._mplex = multiplex({}, function (stream, ch) {
        if (ch === '0') {
            stream.pipe(self._handleRPC());
        }
    });
    
    this._rpc = this._mplex.createStream('0');
    this._provided = {};
    this._requested = {};
    this._hashes = {};
    this._index = 0;
    this._loader = fn;
    this._closed = { local: false, remote: false };
}

Rep.prototype._read = function () {
    if (this._closed.remote && this._closed.local) return;
    
    var buf, times = 0;
    while ((buf = this._mplex.read()) !== null) {
        this.push(buf);
        times ++;
    }
    if (times === 0) this._reading = true;
};

Rep.prototype._write = function (buf, enc, next) {
    return this._mplex._write(buf, enc, next);
};

Rep.prototype.destroy = function () {
    this._mplex.destroy();
};

Rep.prototype._handleRPC = function () {
    var self = this;
    return through.obj(function (buf, enc, next) {
        var msg = decode(buf);
        if (!msg) return self.destroy();
        console.error('msg=', msg);
    });
    
    function decode (buf) {
        try { return RPC.decode(buf) }
        catch (err) { return null }
    }
};

Rep.prototype.since = function (seq) {
    /*
    var cmd = [ codes.since, seq ];
    this._rpc.write(JSON.stringify(cmd) + '\n');
    */
};

Rep.prototype.provide = function (hashes) {
    this._rpc.write(RPC.encode({
        type: TYPE.AVAILABLE,
        hashes: hashes
    }));
    /*
    var self = this;
    if (!isarray(hashes) && hashes && typeof hashes === 'object') {
        Object.keys(hashes).forEach(function (key) {
            self._provided[key] = hashes[key];
        });
    }
    else {
        if (!isarray(hashes)) hashes = [ hashes ];
        hashes.forEach(function (h) {
            self._provided[h] = true;
        });
    }
    var cmd = [ codes.available, hashes ];
    this._rpc.write(JSON.stringify(cmd) + '\n');
    */
};

Rep.prototype.request = function (hashes) {
    console.error(hashes);
    
    /*
    var self = this;
    if (!isarray(hashes)) hashes = [ hashes ];
    hashes.forEach(function (h) {
        self._requested[h] = true;
    });
    var cmd = [ codes.request, hashes ];
    this._rpc.write(JSON.stringify(cmd) + '\n');
    */
};

Rep.prototype.close = function () {
    /*
    this._rpc.write(JSON.stringify([ codes.close ]) + '\n');
    this._closed.local = true;
    if (this._closed.remote) {
        this.emit('close');
        this.push(null);
    }
    */
};
