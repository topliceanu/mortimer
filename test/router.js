var assert = require('assert');
var request = require('request');
var express = require('express');

var Mortimer = require('./../');
var fixtures = require('./fixtures');


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
var baseUrl = 'http://192.168.80.131:'+port+'/api/v1';
var port = app.address ? app.address().port : 8080;
var mortimer = new Mortimer({base: '/api', version: 'v1'});
mortimer.router(fixtures.Book).bind(app);
app.listen(port);


describe( 'Router.js', function () {
	before( function (done) {
		fixtures.Author.collection.remove( function (err) {
			if (err) throw err;
			fixtures.Book.collection.remove( function (err) {
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



	it('GET /api/v1/books/'+book1.id, function (done) {
		return request({
			method: 'GET', 
			url: baseUrl+'/books/'+book1.id
		}, function (err, res, body) {
			if (err) throw err;
			assert.equal(res.statusCode, 200);
			var book = JSON.parse(body);
			assert.equal(book.id, book1.id);
			assert.equal(book.title, book1.title);
			assert.equal(book.author, book1.author);
			return done();
		});
	});


	it('POST /api/v1/books/'+book1.id, function (done) {});
	it('PUT /api/v1/books/'+book1.id, function (done) {});
	it('DELETE /api/v1/books/'+book1.id, function (done) {});



	it('GET /api/v1/books', function (done) {
		return request({
			method: 'GET', 
			url: baseUrl+'/books'
		}, function (err, res, body) {
			if (err) throw err;
			assert.equal(res.statusCode, 200);
			var books = JSON.parse(body);
			assert.equal(books.length, 3);
			return done();
		});
	});


	it('POST /api/v1/books', function (done) {
		return request({
			method: 'POST', 
			url: baseUrl+'/books',
			form: {
				title: 'Novels',
				author: author.id
			}
		}, function (err, res, body) {
			if (err) throw err;
			assert.equal(res.statusCode, 200);
			var book = JSON.parse(body);
			assert.equal(book.title, 'Novels');
			return done();
		});
	});


	it('PUT /api/v1/books', function (done) {
		return request({
			method: 'PUT', 
			url: baseUrl+'/books',
			form: {
				title: 'Test',
				author: author.id
			}
		}, function (err, res, body) {
			if (err) throw err;
			assert.equal(res.statusCode, 200);
			var books = JSON.parse(body);
			assert.equal(books.length, 4);
			assert.equal(books[0].title, 'Test');
			return done();
		});
	});


	it('DELETE /api/v1/books', function (done) {
		return request({
			method: 'DELETE', 
			url: baseUrl+'/books'
		}, function (err, res, body) {
			if (err) throw err;
			assert.equal(res.statusCode, 200);
			return fixtures.Book.count( function (err, count) {
				if (err) throw err;
				assert.equal(count, 0);
				return done();
			});
		});
	});




	after( function (done) {
		return fixtures.Author.collection.remove( function (err) {
			if (err) throw err;
			return fixtures.Book.collection.remove( function (err) {
				if (err) throw err;
				return done();
			});
		});
	});

});
