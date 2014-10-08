var shasum = require('shasum');
var messages = [ 'hey yo', 'WHATEVER', 'beep' ];

messages.forEach(function (msg) {
    exports[shasum(msg)] = msg;
});
