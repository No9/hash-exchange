var shasum = require('shasum');
var test = require('tape');
var exchange = require('../');
var Readable = require('readable-stream').Readable;
var concat = require('concat-stream');

var messages = {};
messages.a = [ 'hey yo', 'WHATEVER', 'beep', 'zoom' ];
messages.b = [ 'boop', 'beep', 'hey yo' ];

var data = { a: {}, b: {} };
messages.a.forEach(function (msg) {
    data.a[shasum(msg)] = msg;
});
messages.b.forEach(function (msg) {
    data.b[shasum(msg)] = msg;
});

test('since', function (t) {
    t.plan(8);
    
    var a = exchange(function (hash) {
        var r = new Readable;
        r._read = function () {};
        r.push(data.a[hash]);
        r.push(null);
        r.meta = { zzz: 789 };
        return r;
    });
    a.on('since', function (seq) {
        t.equal(seq, 2);
        a.provide(Object.keys(data.a).slice(seq));
    });
    a.on('available', function (hashes) {
        t.deepEqual(hashes, [ shasum('hey yo') ]);
        a.request(hashes);
    });
    a.on('response', function (hash, stream) {
        t.deepEqual(stream.meta, { xyz: 345 });
        stream.pipe(concat(function (body) {
            t.equal(body.toString('utf8'), data.b[hash]);
        }));
    });
    a.since(1);
    
    var b = exchange(function (hash) {
        var r = new Readable;
        r._read = function () {};
        r.push(data.b[hash]);
        r.push(null);
        r.meta = { xyz: 345 };
        return r;
    });
    b.on('since', function (seq) {
        t.equal(seq, 1);
        b.provide(Object.keys(data.b).slice(seq));
    });
    b.on('available', function (hashes) {
        t.deepEqual(hashes, [ shasum('zoom') ]);
        b.request(hashes);
    });
    b.on('response', function (hash, stream) {
        t.deepEqual(stream.meta, { zzz: 789 });
        stream.pipe(concat(function (body) {
            t.equal(body.toString('utf8'), data.a[hash]);
        }));
    });
    b.since(2);
    
    a.pipe(b).pipe(a);
});
