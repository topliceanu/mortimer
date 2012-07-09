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

var app = express.createServer();

var mortimer = new Mortimer({
	base: '/api',
	version: 'v1'
});

mortimer.router(fixtures.Book).bind(app);
mortimer.router(fixtures.Author).bind(app);



describe( 'Router class', function () {

	before( function (done) {
		var that = this;
		return fixtures.Author.collection.remove( function (err) {
			if (err) throw err;
			return fixtures.Book.collection.remove( function (err) {
				if (err) throw err;
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
									return done();
								});
							});
						});
					});
				});
			});
		});
	});


	it('POST /api/v1/books/'+book1.id+' should be forbidden' , function (done) {
		return request(app)
			.post('/api/v1/books/'+book1.id)
			.end(function (err, res) {
				if (err) throw err;
				assert.equal(res.statusCode, 403);
				assert.equal(res.text, 'Forbidden');
				return done();
			});
	});


	it('GET /api/v1/books/'+book1.id+' should return a book', function (done) {
		var expected = resBook.print(book1);
		return request(app)
			.get('/api/v1/books/'+book1.id)
			.end( function (err, res) {
				if (err) throw err;
				if (res.text.toLowerCase() === 'not found') 
					throw new Error('Book #'+book1.id+' not found');

				var actual = JSON.parse(res.text);

				assert.equal(res.statusCode, 200);
				assert.ok(/application\/json/.test(res.headers['content-type']));
				assert.equal(expected.id, actual.id);
				assert.equal(expected.author, actual.author);
				assert.equal(expected.title, actual.title);

				return done();
			});
	});

	/*
	it('PUT /api/v1/books/'+book1.id+' should update the book', function (done) {
		var expected = resBook.print(book1);
		expected.title = 'War and Peace 2';

		return request(app)
			.put('/api/v1/books/'+book1.id)
			.send({'title': 'War and Peace 2'})
			.end( function (err, res) {
				if (err) throw err;	
					
				var actual = JSON.parse(res.text);

				assert.equal(res.statusCode, 200);
				assert.ok(/application\/json/.test(res.headers['content-type']));
				assert.equal(expected.id, actual.id);
				assert.equal(expected.author, actual.author);
				assert.equal(expected.title, actual.title);

				return done();
			});
	});
	*/

	it('DEL /api/v1/books/'+book1.id+' should delete the book', function (done) {
		return request(app)
			.del('/api/v1/books/'+book1.id)
			.end( function (err, res) {
				if (err) throw err;

				assert.equal(res.statusCode, 200);
				assert.equal(res.text, 'OK');
				return done();
			});
	});

	/*
	it('POST /api/v1/books should create a new book', function (done) {
		return request(app)
			.post('/api/v1/books')
			.send({
				'title': 'War and Peace 3',
				'author': author
			}).end( function (err, res) {
				if (err) throw err;

				assert.equal(res.statusCode, 200);
				return done();
			});
	});
	*/

	it('GET /api/v1/books should retrieve all available books', function (done) {
		return request(app)
			.get('/api/v1/books')
			.end( function (err, res) {
				if (err) throw err;
				var books = JSON.parse(res.text);

				assert.equal(res.statusCode, 200);
				assert.equal(books.length, 2);
			});
	});

	after( function (done) {
		var that = this;
		return fixtures.Author.collection.remove( function () {
			return fixtures.Book.collection.remove( function () {
				return done();
			});
		});
	});

});
