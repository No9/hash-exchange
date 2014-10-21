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

test('meta', function (t) {
    t.plan(8);
    
    var a = exchange({ id: 'A', meta: { x: 4 } }, function (hash) {
        var r = new Readable;
        r._read = function () {};
        r.push(data.a[hash]);
        r.push(null);
        return r;
    });
    a.provide(Object.keys(data.a));
    a.on('handshake', function (id, meta) {
        t.deepEqual(id, 'B');
        t.deepEqual(meta, { y: 5 });
    });
    a.on('available', function (hashes) {
        t.deepEqual(hashes, [ shasum('boop') ]);
        a.request(hashes);
    });
    a.on('response', function (hash, stream) {
        stream.pipe(concat(function (body) {
            t.equal(body.toString('utf8'), data.b[hash]);
        }));
    });
    
    var b = exchange({ id: 'B', meta: { y: 5 } }, function (hash) {
        var r = new Readable;
        r._read = function () {};
        r.push(data.b[hash]);
        r.push(null);
        return r;
    });
    b.provide(Object.keys(data.b));
    b.on('handshake', function (id, meta) {
        t.deepEqual(id, 'A');
        t.deepEqual(meta, { x: 4 });
    });
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
