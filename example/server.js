var net = require('net');
var exchange = require('../');
var data = require('./server_data.js');
var concat = require('concat-stream');

net.createServer(function (stream) {
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
    
    stream.pipe(ex).pipe(stream);
}).listen(5000);
