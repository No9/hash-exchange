var net = require('net');
var exchange = require('../');
var Readable = require('readable-stream').Readable;
var concat = require('concat-stream');
var shasum = require('shasum');

var messages = [ 'hey yo', 'WHATEVER', 'beep' ];
var data = {};
messages.forEach(function (msg) { data[shasum(msg)] = msg });

var ex = exchange(function (hash) {
    var r = new Readable;
    r._read = function () {};
    r.push(data[hash]);
    r.push(null);
    return r;
});
ex.provide(Object.keys(data));

ex.on('available', function (hashes) {
    ex.request(hashes);
});

ex.on('response', function (hash, stream) {
    stream.pipe(concat(function (body) {
        console.log('# BEGIN ' + hash);
        console.log(body.toString('utf8'));
        console.log('# END ' + hash);
    }));
});
ex.pipe(net.connect(5000)).pipe(ex);
