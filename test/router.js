var assert = require('assert');
var request = require('supertest');
var express = require('express');

var Mortimer = require('./../');
var Resource = require('./../lib/Resource.js');
var fixtures = require('./fixtures');


var resBook = new Resource(fixtures.Book);
var resAuthor = new Resource(fixtures.Author);

var author = new fixtures.Author({
	'name': 'Lev Tolstoi',
	'nationality': 'russian'
});
var book1 = new fixtures.Book({
	'title': 'War and Peace',
	'author': author
});
var book2 = new fixtures.Book({
	'title': 'Anna Karenina',
	'author': author
});
var book3 = new fixtures.Book({
	'title': 'Redemption',
	'author': author
});

var app = express();

var mortimer = new Mortimer({
	base: '/api',
	version: 'v1'
});

mortimer.router(fixtures.Book).bind(app);
mortimer.router(fixtures.Author).bind(app);



describe( 'Router class', function () {

	before( function (next) {
		var that = this;
		author.save( function (err) {
			if (err) throw err;
			book1.save( function (err) {
				if (err) throw err;
				book2.save( function (err) {
					if (err) throw err;
					book3.save( function (err) {
						if (err) throw err;
						author.books = [book1, book2, book3];
						author.save( function (err) {
							if (err) throw err;
							return next();
						});
					});
				});
			});
		});
	});


	/*
	it('POST /api/v1/books/'+book1.id+' should return the book', function (done) {
		var expected = JSON.stringify(resBook.print(book1));
		return request(app)
			.get('/api/v1/books/'+book1.id)
			.set('Accept', 'application/json')
			.expect('Content-Type', 'application/json')
			.expect(expected)
			.expect(200, done);
	});
	*/


	it('POST /api/v1/books/'+book1.id+' should be forbidden', function (done) {
		return request(app)
			.post('/api/v1/books/'+book1.id)
			.expect('Forbidden')
			.end(done);
	});


	//TODO  test more routes


	after( function (next) {
		var that = this;
		return fixtures.Author.collection.remove( function () {
			return fixtures.Book.collection.remove( function () {
				return next();
			});
		});
	});

});
