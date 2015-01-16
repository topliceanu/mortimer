/*
 * This example shows how to add common middleware to all endpoints.
 *
 * Because express works with arrays of middleware, changing endpoint
 * functionality is as easy as splicing and dicing arrays of middleware.
 * To achive this, we will extend mortimer.Resource to add a before() hook
 * method to each endpoint. This injects an array of custom middleware
 * in front of all middleware for existing endpoints.
 *
 * In this particular example, we want to count the requests to each endpoint.
 * Why would you want to do that? Hey, it's just an example! But seriously,
 * you can use this to add authentication, rate limiting, payload validation,
 * output sanitation, etc. Mortimer provides the backbone for all that.
 *
 * To run, simply:
 *  $ node ./quick-bootstrap.js
 *
 * To test:
 * $ curl -XPOST http://localhost:3000/books -H 'Content-type: application/json' -d '{"title": "Brothers Karamazov", "author": "Feodor Dostoevsky"}'
 * $ {"meta":{},"data":{"__v":0,"title":"Brothers Karamazov","author":"Feodor Dostoevsky","_id":"54b8e92691dd770c0a3bf9be"}}
 * $ Request counters { createDoc: 1, readDocs: 0, readDoc: 0, patchDoc: 0, removeDoc: 0 }
 */


var util = require('util');

var bodyParser = require('body-parser');
var express = require('express');
var mongoose = require('mongoose');
var mortimer = require('../lib/'); // require('mortimer');


// Handle connection to mongodb and data modeling.
mongoose.connect('mongodb://localhost:27017/examples');

var BookSchema = new mongoose.Schema({
    'title': {type: String},
    'author': {type: String}
});

var Book = mongoose.model('Book', BookSchema);


// Setup http server with express.
var app = express();
app.set('query parser', 'simple');
app.use(bodyParser.json());


// Extend mortimer.Resource class to add a before hook.
var ResourceWithHooks = function (Model, options) {
    mortimer.Resource.call(this, Model, options);
};
util.inherits(ResourceWithHooks, mortimer.Resource);

// By default this method adds no extra middleware, but subclasses can
// implement this to add their own custom functionality.
ResourceWithHooks.prototype.before = function (tag) {
    return []
};

// All endpoints are being overriden to add the before() method.
ResourceWithHooks.prototype.createDoc = function(options) {
    var original = mortimer.Resource.prototype.createDoc.call(this, options);
    original.unshift(this.before('createDoc'));
    return original;
};

ResourceWithHooks.prototype.readDocs = function(options) {
    var original = mortimer.Resource.prototype.readDocs.call(this, options);
    original.unshift(this.before('readDocs'));
    return original;
};

ResourceWithHooks.prototype.readDoc = function(options) {
    var original = mortimer.Resource.prototype.readDoc.call(this, options);
    original.unshift(this.before('readDoc'));
    return original;
};

ResourceWithHooks.prototype.patchDoc = function(options) {
    var original = mortimer.Resource.prototype.patchDoc.call(this, options);
    original.unshift(this.before('patchDoc'));
    return original;
};

ResourceWithHooks.prototype.removeDoc = function(options) {
    var original = mortimer.Resource.prototype.removeDoc.call(this, options);
    original.unshift(this.before('removeDoc'));
    return original;
};


// Extend ResourceWithHooks to add a counter middleware before all endpoints.
var BookResource = function () {
    ResourceWithHooks.call(this, Book);
};
util.inherits(BookResource, ResourceWithHooks);

// This method implements the counting routine.
BookResource.prototype.counter = function (tag) {
    if (!this.counters) {
        this.counters = {};
    }
    if (!this.counters[tag]) {
        this.counters[tag] = 0;
    }
    var that = this;
    return function (req, res, next) {
        that.counters[tag] += 1;
        console.log('Request counters', that.counters);
        next()
    };
};

// Override ResourceWithHooks#before() add the counter middleware.
BookResource.prototype.before = function (tag) {
    return [
        this.counter(tag)
    ];
};


// Setup mortimer endpoints.
var resource = new BookResource();
app.post('/books', resource.createDoc());
app.get('/books', resource.readDocs());
app.get('/books/:bookId', resource.readDoc());
app.patch('/books/:bookId', resource.patchDoc());
app.delete('/books/:bookId', resource.removeDoc());


// Start the http server on http://localhost:3000/
app.listen(3000, 'localhost');
