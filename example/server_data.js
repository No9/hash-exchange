var shasum = require('shasum');
var messages = [ 'beep', 'boop' ];

messages.forEach(function (msg) {
    exports[shasum(msg)] = msg;
});
