var multiplex = require('multiplex');
var inherits = require('inherits');
var Duplex = require('readable-stream').Duplex;
var through2 = require('through2');
var split = require('split');
var isarray = require('isarray');
var has = require('has');

module.exports = Rep;
inherits(Rep, Duplex);

var codes = { available: 0, request: 1, hashes: 2 };

function Rep (fn) {
    if (!(this instanceof Rep)) return new Rep(fn);
    Duplex.call(this);
    this._mplex = multiplex(function (stream, id) {
        if (id === 0) {
            var s = combine(stream, split(JSON.parse), this._handleRPC());
            s.on('error', function () {});
        }
        else if (has(self._available, id)) {
            var hash = self._available[id]
            self.emit('response', hash, stream);
        }
    });
    this._rpc = this._mplex.createStream(0);
    this._provided = {};
    this._available = {};
    this._index = 1;
    this._loader = fn;
}

Rep.prototype._handleRPC = function () {
    var self = this;
    return through.obj(function (row, enc, next) {
        if (!isarray(row)) return next();
        if (row[0] === codes.available) {
            self.emit('available', isarray(row[1]) ? row[1] : [ row[1] ]);
        }
        else if (row[0] === codes.request) {
            var hashes = isarray(row[1]) ? row[1] : [ row[1] ];
            var hs = {};
            hashes.forEach(function (h) {
                if (has(self._provided, h)) {
                    hs[h] = self._index ++;
                }
            });
            var cmd = [ codes.hashes, hs ];
            self._rpc.write(JSON.stringify(cmd) + '\n');
            
            Object.keys(hashes).forEach(function (hash) {
                var index = hashes[hash];
                var r = self._loader(hash);
                r.pipe(self._mplex.createStream(index));
            });
        }
        else if (row[0] === codes.hashes) {
            Object.keys(row[1] || {}).forEach(function (hash) {
                var index = row[1][hash];
                self._available[index] = hash;
            });
        }
        next();
    });
};

Rep.prototype._read = function (bytes) {
    return this._mplex._read(bytes);
};

Rep.prototype._write = function (buf, enc, next) {
    return this._mplex._write(buf, enc, next);
};

Rep.prototype.provide = function (hashes) {
    var self = this;
    if (!isarray(hashes)) hashes = [ hashes ];
    hashes.forEach(function (h) {
        self._provided[h] = true;
    });
    var cmd = [ codes.available, hashes ];
    this._rpc.write(JSON.stringify(cmd) + '\n');
};

Rep.prototype.request = function (hashes) {
    var cmd = [ codes.request, hashes ];
    this._rpc.write(JSON.stringify(cmd) + '\n');
};
