var shasum = require('shasum');
var messages = [ 'hey yo', 'WHATEVER' ];

messages.forEach(function (msg) {
    exports[shasum(msg)] = msg;
});
