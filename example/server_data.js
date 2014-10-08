var shasum = require('shasum');
var messages = [ 'beep', 'boop', 'hey yo' ];

messages.forEach(function (msg) {
    exports[shasum(msg)] = msg;
});
