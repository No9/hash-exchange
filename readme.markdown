# hash-exchange

trade hashes to replicate data with a remote endpoint

[![build status](https://secure.travis-ci.org/substack/hash-exchange.png)](http://travis-ci.org/substack/hash-exchange)

Trading hashes is very useful for replication on top of a content-addressable
store where nodes have highly variable levels of information. This would be the
case for a gossip network.

# example

First, some code that takes messages on argv, hashes them, then provides those
hashes using hash-exchange:

``` js
var exchange = require('hash-exchange');
var through = require('through2');
var concat = require('concat-stream');
var shasum = require('shasum');

var messages = process.argv.slice(2);
var data = {};
messages.forEach(function (msg) { data[shasum(msg)] = msg });

var ex = exchange(function (hash, cb) {
    var r = through();
    r.end(data[hash]);
    cb(null, r);
});
ex.provide(Object.keys(data));

ex.on('available', function (hashes) {
    ex.request(hashes);
});

ex.on('response', function (hash, stream) {
    stream.pipe(concat(function (body) {
        console.error('# BEGIN ' + hash);
        console.error(body.toString('utf8'));
        console.error('# END ' + hash);
    }));
});
process.stdin.pipe(ex).pipe(process.stdout);
```

Now we can run two instances of this program, one with:

``` js
[ 'beep', 'boop', 'hey yo' ]
```

and the other with

``` js
[ 'hey yo', 'WHATEVER', 'beep' ]
```

After wiring up the stdin and stdout, the programs provide each other with the
data they don't individually have:

```
$ dupsh 'node ex.js beep boop "hey yo"' 'node ex.js "hey yo" WHATEVER beep'
# BEGIN fdb608cccac07c273ab532bb41eea07e2ddccf4e
WHATEVER
# END fdb608cccac07c273ab532bb41eea07e2ddccf4e
# BEGIN ae8d904cebfd629cdb1cc773a5bce8aca1dc1eee
boop
# END ae8d904cebfd629cdb1cc773a5bce8aca1dc1eee
```

# methods

``` js
var exchange = require('hash-exchange')
```

## var ex = exchange(createReadStream)

Create a hash exchange instance `ex` from `createReadStream(hash, cb)`, a
function that takes a hash as an argument and should call `cb(err, stream, seq)`
with a readable `stream` of data for `hash`. Optionally the read stream can
indicate a sequence integer `seq`.

`ex` is a duplex stream. You should pipe it to and from another hash exchange
instance, perhaps over a network link.

You can optionally provide:

## ex.provide(hashes)

Tell the remote endpoint about an array of `hashes`.

## ex.request(hashes)

Ask the remote endpoint to read the content of an array of `hashes`.

## ex.since(seq)

Inform the other side of the connection to only serve hashes since `seq` through
the `'since'` event on the remote side..

`seq` can be any value that serializes with `JSON.stringify()`.

## ex.close()

When the local exchange is done and doesn't need any more data, call this
function to inform the remote side. When both sides have called `.close()`, the
connection will terminate.

# events

## ex.on('response', function (hash, stream) {})

When a requested hash has been sent from the other end, this event fires with
the `hash`, a readable `stream` of the remote file contents.

## ex.on('available', function (hashes) {})

After the other end of the connection has provided some hashes, this event fires
with the array of remote hashes not already provided locally.

## ex.on('since', function (seq) {})

When the remote instance calls `.since(seq)`, this event fires with the sequence
`seq` that was called.

## ex.on('close', function () {})

This event fires when both sides of the connection have called `.close()` and
each side doesn't need any more data.

# install

With [npm](https://npmjs.org) do:

```
npm install hash-exchange
```

# license

MIT
