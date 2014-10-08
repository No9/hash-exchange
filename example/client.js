var net = require('net');
var exchange = require('../');
var data = require('./client_data.js');
var concat = require('concat-stream');

var ex = exchange(function (hash) {
    return data[hash];
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
