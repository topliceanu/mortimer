var assert = require('assert');

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
});
