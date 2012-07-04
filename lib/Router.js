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


fn.bindModelRoutes = function () {
	var documentUrl = this.options.baseUrl + this.resource.path(true);
	var collectionUrl = this.options.baseUrl + this.resource.path();

	var init = this.middleware.init, 
			forbid = this.middleware.forbid(),
			query = express.query(),
			pagination = this.middleware.pagination(),
			fields = this.middleware.fields(),
			filters = this.middleware.filters(),
			execute = this.middleware.execute();
	
	this.app.get( collectionUrl, init, query, pagination, fields, filters, execute);
	this.app.post( collectionUrl, init, execute);
	this.app.put( collectionUrl, init, query, filters, execute);
	this.app.del( collectionUrl, init, query, filters, execute);

	this.app.get( documentUrl, init, query, fields, execute);
	this.app.post( documentUrl, forbid);
	this.app.put( documentUrl, init, query, filters, execute);
	this.app.del( documentUrl, init, query, filters, execute);
};


// add middleware
fn.middleware = {};


fn.middleware.forbid = function (opts) {
	return function (req, res, next) {
		return res.send(403, 'Forbidden');
	};
};


// needs: req.method, [req.body], [req.params]
// sets:  req.mort, req.mort.action, [req.mort.id], [req.mort.body]
fn.middleware.init = function (opts) {
	return function (req, res, next) {
		if (req.mort) 
			throw new Error('namespace request.mort already exists');

		req.mort = {};
		req.mort.action = req.method;
		req.mort.id = req.params[this.resource.key];
		req.mort.body = req.body;
		return next();
	};
};


// needs: [req.query.limit], [req.query.offset]
// sets:  [req.mort.pagination]
fn.middleware.pagination = function (opts) {
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


// needs: [req.query.fields]
// sets: 	[req.mort.fields]
fn.middleware.fields = function (opts) {
	return function (req, res, next) {
		if (!req.query || !req.query.fields) return next();

		var fields = req.query.fields.split(',');
		if (fields.length !== 0)
			req.mort.fields = fields;

		delete req.query.fields;
		return next();
	};
};


// sets: [req.mort.filters]
fn.middleware.filters = function (opts) {
	return function (req, res, next) {
		if (!req.query) return next();

		req.mort.filters = {};
		for (filter in req.query) {
			req.mort.filters[filter] = req.query[filter];
		}

		delete req.query;
		return next();
	};
};


// needs: req.mort.action, [req.mort.id], [req.mort.body], [req.mort.pagination], [req.mort.fields], [req.mort.filters]
fn.middleware.execute = function (opts) {
	return function (req, res, next) {
		return this.resource.execute(req.mort, function (err, data) {
			if (err) {
				console.log(err);
				return res.send(err.code);
			}
			return res.send(data, 200);
		});
	};
};


// public api
module.exports = Router;
