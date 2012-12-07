mortimer = MOngoose ResT
========================

[![Build Status](https://secure.travis-ci.org/topliceanu/mortimer.png)](https://travis-ci.org/topliceanu/mortimer)


Gist
----

**Mortimer** creates a rest interface for predefined mongoose models and it's powered by express.

Usage
-----

````javascript

var express = require('express');
var Mortimer = require('mortimer');
var Author = ..
var Book = ..

var app = express();


// Initialize mortimer with custom endpoint base urls.
var mortimer = new Mortimer({
    base: '/service/api', // default is /api
    version: 'v2' // default is v1
});


// Let mortimer generate standard endpoints for your model.
mortimer.router(Book).bind(app);
mortimer.router(Author, {version: 'v2'}).bind(app);
// The above will generate GET /service/api/v2/authors, POST /service/api/v2/authors, etc.


// OR Use mortimer's middleware functions just for data fetching.
app.get('/api/book/:bookId', [someFancyMiddleware], mortimer.middleware(Book, 'read'));


// Bind app to a port.
app.listen(3000);

````

Resources
---------

1. [W3C HTTP Method Descriptions](http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html)
