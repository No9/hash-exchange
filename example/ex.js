var exchange = require('../');
var through = require('through2');
var concat = require('concat-stream');
var shasum = require('shasum');

var messages = process.argv.slice(2);
var data = {};
messages.forEach(function (msg) { data[shasum(msg)] = msg });

var ex = exchange(function (hash, cb) {
    var r = through();
    r.end(data[hash]);
    cb(null, r);
});
ex.provide(Object.keys(data));

ex.on('available', function (hashes) {
    ex.request(hashes);
});

ex.on('response', function (hash, stream) {
    stream.pipe(concat(function (body) {
        console.error('# BEGIN ' + hash);
        console.error(body.toString('utf8'));
        console.error('# END ' + hash);
    }));
});
process.stdin.pipe(ex).pipe(process.stdout);
