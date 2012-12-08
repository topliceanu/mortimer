// Mortimer.js - entry point and configuration utility

/*
	usage:

	var express = require('express');
	var Mortimer = require('mortimer');

	var app = express.createServer();

    // Initialize mortimer with default endpoint urls: /api/v1/...
	var mortimer = new Mortimer({
		base: '/api',
		version: 'v1'
	});

    // Autogenerate all standard endpoints.
	mortimer.router(Book).bind(app);
	mortimer.router(Author, {version: 'v2'}).bind(app);

    // OR Use available middleware to customize endpoints.
    app.get('/api/author/:authorId', mortimer.middleware(Author, 'read'));

    // Bind app to a port.
	app.listen(3000);

*/

var Resource = require('./Resource.js');
var Router = require('./Router.js');
var util = require('./util.js');


var Mortimer = function (options) {
	var defaults = {
		'base': '/api',
		'version': 'v1'
	};
	this.options = util.extend(defaults, options);
};


// prototype alias
var fn = Mortimer.prototype;


fn.router = function (Model, options) {
	var resource = new Resource(Model);
	var localOptions = util.extend({}, this.options, options);
	var router = new Router(resource, localOptions);
	return router;
};

fn.middleware = function (Model, action) {
    var router = this.router(Model);
    var middleware = router['middleware'+util.titleize(action)];
    if (!middleware) {
        throw new Error('No middleware registred for action '+action);
    }
    return middleware.call(router);
};

[
    'read',
    'create',
    'update',
    'delete',
    'readAll',
    'updateAll',
    'deleteAll'
].forEach( function (action) {
    fn[action] = function (Model) {
        return this.middleware(Model, action);
    };
});


// public api
module.exports = Mortimer;
