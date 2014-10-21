var multiplex = require('multiplex');
var inherits = require('inherits');
var Duplex = require('readable-stream').Duplex;
var through = require('through2');
var split = require('split');
var isarray = require('isarray');
var has = require('has');
var defined = require('defined');

module.exports = Rep;
inherits(Rep, Duplex);

var codes = { handshake: 0, available: 1, request: 2, hashes: 3 };

function Rep (opts, fn) {
    var self = this;
    if (!(this instanceof Rep)) return new Rep(opts, fn);
    Duplex.call(this);
    if (typeof opts === 'function') {
        fn = opts;
        opts = {};
    }
    if (!opts) opts = {};
    
    this._mplex = multiplex(function (stream, id) {
        if (has(self._hashes, id)) {
            self.emit('response', self._hashes[id], stream);
        }
    });
    this._mplex.on('readable', function () {
        if (self._reading) {
            self._reading = false;
            self._read();
        }
    });
    
    this._rpc = this._mplex.createStream(0);
    var sp = split(JSON.parse);
    sp.on('error', function () {});
    this._rpc.pipe(sp).pipe(this._handleRPC());
    
    this._id = defined(
        opts.id,
        Math.floor(Math.random() * Math.pow(16,8)).toString(16)
    );
    this._rpc.write(JSON.stringify([
        codes.handshake, this._id, defined(opts.meta, {})
    ]) + '\n');
    
    this._provided = {};
    this._requested = {};
    this._hashes = {};
    this._index = 0;
    this._loader = fn;
}

Rep.prototype._read = function () {
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

Rep.prototype._handleRPC = function () {
    var self = this;
    return through.obj(function (row, enc, next) {
        if (!isarray(row)) return next();
        if (row[0] === codes.handshake) {
            if (self._id > row[1]) {
                self._even = true;
            }
            else if (self._id < row[1]) {
                self._even = false;
            }
            else {
                return self.push(null);
            }
            self.emit('handshake', row[1], row[2]);
        }
        else if (row[0] === codes.request) {
            var hashes = isarray(row[1]) ? row[1] : [ row[1] ];
            var hs = {}, rs = {};
            
            hashes.forEach(function (h) {
                if (!has(self._provided, h)) return false;
                var r = self._loader(h);
                if (!r) return false;
                
                var ix = self._index ++ * 2 + (self._even ? 1 : 2);
                rs[h] = { stream: r, index: ix };
                hs[h] = ix;
            });
            
            var cmd = [ codes.hashes, hs ];
            self._rpc.write(JSON.stringify(cmd) + '\n');
            
            Object.keys(rs).forEach(function (hash) {
                var r = rs[hash].stream, index = rs[hash].index;
                var stream = self._mplex.createStream(index);
                r.pipe(stream);
            });
        }
        else if (row[0] === codes.available) {
            var hashes = isarray(row[1]) ? row[1] : [ row[1] ];
            var hs = hashes.filter(function (h) {
                return !has(self._provided, h);
            });
            self.emit('available', hs);
        }
        else if (row[0] === codes.hashes) {
            Object.keys(row[1] || {}).forEach(function (hash) {
                if (has(self._requested, hash)) {
                    var index = row[1][hash];
                    self._hashes[index] = hash;
                }
            });
        }
        next();
    });
};

Rep.prototype.provide = function (hashes) {
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
};

Rep.prototype.request = function (hashes) {
    var self = this;
    if (!isarray(hashes)) hashes = [ hashes ];
    hashes.forEach(function (h) {
        self._requested[h] = true;
    });
    var cmd = [ codes.request, hashes ];
    this._rpc.write(JSON.stringify(cmd) + '\n');
};
