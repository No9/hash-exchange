var shasum = require('shasum');

var messages = [ 'hey yo', 'WHATEVER' ];
var hashes = {};
messages.forEach(function (msg) {
    hashes[msg] = shasum(msg);
});

module.exports = hashes;
