var shasum = require('shasum');
var test = require('tape');
var exchange = require('../');
var Readable = require('readable-stream').Readable;
var concat = require('concat-stream');

var messages = {};
messages.a = [ 'hey yo', 'WHATEVER', 'beep', 'zoom' ];
messages.b = [ 'boop', 'beep', 'hey yo' ];

var data = { a: {}, b: {} };
var keys = { a: [], b: [] };
messages.a.forEach(function (msg) {
    var h = shasum(msg);
    data.a[h] = msg;
    keys.a.push(h);
});
messages.b.forEach(function (msg) {
    var h = shasum(msg);
    data.b[h] = msg;
    keys.b.push(h);
});

test('since', function (t) {
    t.plan(6);
    
    var a = exchange(function (hash, cb) {
        var r = new Readable;
        r._read = function () {};
        r.push(data.a[hash]);
        r.push(null);
        cb(null, r, { zzz: 789 });
    });
    a.on('since', function (seq) {
        t.equal(seq, 2);
        a.provide(keys.a.slice(seq));
    });
    a.on('available', function (hashes) {
        t.deepEqual(hashes, [ shasum('hey yo') ]);
        a.request(hashes);
    });
    a.on('response', function (hash, stream) {
        stream.pipe(concat(function (body) {
            t.equal(body.toString('utf8'), data.b[hash]);
        }));
    });
    a.since(1);
    
    var b = exchange(function (hash, cb) {
        var r = new Readable;
        r._read = function () {};
        r.push(data.b[hash]);
        r.push(null);
        cb(null, r, { xyz: 345 });
    });
    b.on('since', function (seq) {
        t.equal(seq, 1);
        b.provide(keys.b.slice(seq));
    });
    b.on('available', function (hashes) {
        t.deepEqual(hashes, [ shasum('zoom') ]);
        b.request(hashes);
    });
    b.on('response', function (hash, stream) {
        stream.pipe(concat(function (body) {
            t.equal(body.toString('utf8'), data.a[hash]);
        }));
    });
    b.since(2);
    
    a.pipe(b).pipe(a);
});
