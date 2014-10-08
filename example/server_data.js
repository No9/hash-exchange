var shasum = require('shasum');

var messages = [ 'beep', 'boop' ];
var hashes = {};
messages.forEach(function (msg) {
    hashes[msg] = shasum(msg);
});

module.exports = hashes;
