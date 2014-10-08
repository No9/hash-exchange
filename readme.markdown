# hash-exchange

trade hashes to replicate data with a remote endpoint

Trading hashes is very useful for replication on top of a content-addressable
store where nodes have highly variable levels of information. This would be the
case for a gossip network.

# example

If you have a server with the content-addressed messages:

``` js
[ 'beep', 'boop', 'hey yo' ]
```

``` js
var exchange = require('hash-exchange');
var net = require('net');
var Readable = require('readable-stream').Readable;
var concat = require('concat-stream');
var shasum = require('shasum');

var messages = [ 'beep', 'boop', 'hey yo' ];
var data = {};
messages.forEach(function (msg) { data[shasum(msg)] = msg });

net.createServer(function (stream) {
    var ex = exchange(function (hash) {
        var r = new Readable;
        r._read = function () {};
        r.push(data[hash]);
        r.push(null);
        return r;
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
```

and a client with the content-addressed messages:

``` js
[ 'hey yo', 'WHATEVER', 'beep' ]
```

``` js
var exchange = require('hash-exchange');
var net = require('net');
var Readable = require('readable-stream').Readable;
var concat = require('concat-stream');
var shasum = require('shasum');

var messages = [ 'hey yo', 'WHATEVER', 'beep' ];
var data = {};
messages.forEach(function (msg) { data[shasum(msg)] = msg });

var ex = exchange(function (hash) {
    var r = new Readable;
    r._read = function () {};
    r.push(data[hash]);
    r.push(null);
    return r;
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
```

Then the client and server can exchange hashes in order to compute the messages
each node doesn't have yet.

For the server, this is the message `'WHATEVER'`:

```
# BEGIN fdb608cccac07c273ab532bb41eea07e2ddccf4e
WHATEVER
# END fdb608cccac07c273ab532bb41eea07e2ddccf4e
```

and the client gets the message `'boop'`:

```
# BEGIN ae8d904cebfd629cdb1cc773a5bce8aca1dc1eee
boop
# END ae8d904cebfd629cdb1cc773a5bce8aca1dc1eee
```

# methods

``` js
var exchange = require('hash-exchange')
```

## var ex = exchange(fn)

Create a hash exchange instance `ex` from `fn(hash)`, a function that takes a
hash as an argument and should return a readable stream of data for `hash`.

`ex` is a duplex stream. You should pipe it to and from another hash exchange
instance, perhaps over a network link.

## ex.provide(hashes)

Tell the remote endpoint about an array of `hashes`.

## ex.request(hashes)

Ask the remote endpoint to read the content of an array of `hashes`.

# events

## ex.on('response', function (hash, stream) {})

When a requested hash has been sent from the other end, this event fires with
the `hash` and a readable `stream` with the contents.

## ex.on('available', function (hashes) {})

After the other end of the connection has provided some hashes, this event fires
with the array of remote hashes not already provided locally.

# install

With [npm](https://npmjs.org) do:

```
npm install hash-exchange
```

# license

MIT
