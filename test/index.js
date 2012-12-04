var assert = require('assert');
var express = require('express');
var request = require('supertest');


var Mortimer = require('./../');
var Router = require('./../lib/Router.js');
var fixtures = require('./fixtures');





describe( 'test Mortimer class', function () {
	before( function () {
		this.mortimer = new Mortimer();
	});

	it('should have sane defaults', function () {
		assert.equal( this.mortimer.options.base, '/api');
		assert.equal( this.mortimer.options.version, 'v1');
	});

	it('should expose a router', function () {
		var actual = this.mortimer.router( fixtures.Author );
		assert.ok( actual instanceof Router, 'instance is not a router' );
	});

    it('should expose a middleware', function () {
        ['read', 'create', 'update', 'delete', 'readAll', 'updateAll', 'deleteAll'].forEach( function (action) {
           var middleware = this.mortimer.middleware(fixtures.Author, action);
           assert.ok(middleware, 'Should return a function'); //TODO check for function objects.
        }, this);
    });

    it('should throw an error when asked for a middleware it does not have', function () {
        var that = this;
        var unsupportedAction = 'purgeDatabase';
        assert.throws(function () {
           var middleware = that.mortimer.middleware(fixtures.Author, unsupportedAction);
        }, Error);
    });
});
