// Router.js - handles REST routes and middleware

var express = require('express');

var util = require('./util.js');


var Router = function (resource, options) {
	this.resource = resource;
	this.options = util.extend({}, options);
	this.options.baseUrl = this.options.base+'/'+this.options.version;
};


// prototype alias
var fn = Router.prototype;


fn.bind = function (app) {
	this.app = app;
	this.bindModelRoutes();
	return this;
};


fn.forbid = function (opts) {
    /**
     * This middleware returns 403 Frobidden
     */
	return function (req, res, next) {
		return res.send(403);
	};
};


fn.init = function (opts) {
    /**
     * Initializes the middleware stack.
     * needs: req.method, [req.body], [req.params]
     * sets: req.mort, req.mort.action, [req.mort.id], [req.mort.body]
     */
	var that = this;
	return function (req, res, next) {
		if (req.mort) 
			throw new Error('namespace request.mort already exists');

		req.mort = {};
		req.mort.action = req.method;
		req.mort.id = req.params[that.resource.key];
		req.mort.body = req.body;
		return next();
	};
};


fn.pagination = function (opts) {
    /**
     * Handles GET requests with pagination.
     * needs: [req.query.limit], [req.query.offset]
     * sets:  [req.mort.pagination]
     */
	return function (req, res, next) {
		if (!req.query || !req.query.limit || !req.query.offset) 
			return next();

		req.mort.pagination = {};
		req.mort.pagination.limit = req.query.limit;
		req.mort.pagination.offset = req.query.offset;

		delete req.query.limit;
		delete req.query.offset;

		return next();
	};
};


fn.fields = function (opts) {
/**
 * Middleware that handles filtering properties in responses.
 * needs: [req.query.fields]
 * sets: [req.mort.fields]
 */
	return function (req, res, next) {
		if (!req.query || !req.query.fields) return next();

		var fields = req.query.fields.split(',');
		if (fields.length !== 0)
			req.mort.fields = fields;

		delete req.query.fields; return next();
	};
};


fn.filters = function (opts) {
    /**
     * sets: [req.mort.filters]
     */
	return function (req, res, next) {
		if (!req.query) return next();

		req.mort.filters = {};
		for (var filter in req.query) {
			req.mort.filters[filter] = req.query[filter];
		}

		delete req.query;
		return next();
	};
};


fn.execute = function (opts) {
    /**
     * Executes the query built by previous middleware.
     * needs: req.mort.action, [req.mort.id], [req.mort.body], [req.mort.pagination], [req.mort.fields], [req.mort.filters]
     */
	var that = this;
	return function (req, res, next) {
		return that.resource.execute(req.mort, function (err, data) {
			if (err) {
				return res.send(err.code);
			}
            if (data.message === '') data.message = undefined;
			if (data && data.code) return res.json(data.code, data.message);
			else return res.send(500, 'Something went terribly wrong!'); // Should not ever get here.
		});
	};
};


// REST Middleware
fn.middlewareDefault = function () {
    return [
        // Wrap middleware inside array because express will flatten it anyway.
        [this.options.pre],
        this.init(),
        express.query(),
        this.fields(),
        this.execute()
    ];
};
fn.middlewareRead = fn.middlewareDefault;
fn.middlewareUpdate = fn.middlewareDefault;
fn.middlewareDelete = fn.middlewareDefault; 
fn.middlewareReadAll = function () {
    return [
        // Wrap middleware inside array because express will flatten it anyway.
        [this.options.pre],
        this.init(),
        express.query(),
        this.pagination(),
        this.fields(),
        this.filters(),
        this.execute()
    ];
};
fn.middlewareCreate = function () {
    return [
        // Wrap middleware inside array because express will flatten it anyway.
        [this.options.pre],
        this.init(),
        this.execute()
    ];
};
fn.middlewareUpdateAll = fn.middlewareDefault;
fn.middlewareDeleteAll = fn.middlewareDefault;


fn.bindModelRoutes = function () {
    // Binds routes to models.
	var documentUrl = this.options.baseUrl + this.resource.path(true);
	var collectionUrl = this.options.baseUrl + this.resource.path();


	this.app.get( documentUrl, this.middlewareRead());
	this.app.post( documentUrl, this.forbid());
	this.app.put( documentUrl, this.middlewareUpdate());
	this.app.del( documentUrl, this.middlewareDelete());
	
	this.app.get( collectionUrl, this.middlewareReadAll());
	this.app.post( collectionUrl, this.middlewareCreate());
	this.app.put( collectionUrl, this.middlewareUpdateAll());
	this.app.del( collectionUrl, this.middlewareDeleteAll());
};


// public api
module.exports = Router;
