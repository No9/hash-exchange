var shasum = require('shasum');
var test = require('tape');
var exchange = require('../');
var Readable = require('readable-stream').Readable;
var concat = require('concat-stream');

var messages = {};
messages.a = [ 'hey yo', 'WHATEVER', 'beep' ];
messages.b = [ 'beep', 'boop', 'hey yo' ];

var data = { a: {}, b: {} };
messages.a.forEach(function (msg) {
    data.a[shasum(msg)] = msg;
});
messages.b.forEach(function (msg) {
    data.b[shasum(msg)] = msg;
});

test('exchange', function (t) {
    t.plan(4);
    
    var a = exchange(function (hash, cb) {
        var r = new Readable;
        r._read = function () {};
        r.push(data.a[hash]);
        r.push(null);
        cb(null, r);
    });
    a.provide(Object.keys(data.a));
    a.on('available', function (hashes) {
        t.deepEqual(hashes, [ shasum('boop') ]);
        a.request(hashes);
    });
    a.on('response', function (hash, stream) {
        stream.pipe(concat(function (body) {
            t.equal(body.toString('utf8'), data.b[hash]);
        }));
    });
    
    var b = exchange(function (hash, cb) {
        var r = new Readable;
        r._read = function () {};
        r.push(data.b[hash]);
        r.push(null);
        cb(null, r);
    });
    b.provide(Object.keys(data.b));
    b.on('available', function (hashes) {
        t.deepEqual(hashes, [ shasum('WHATEVER') ]);
        b.request(hashes);
    });
    b.on('response', function (hash, stream) {
        stream.pipe(concat(function (body) {
            t.equal(body.toString('utf8'), data.a[hash]);
        }));
    });
    
    a.pipe(b).pipe(a);
});
