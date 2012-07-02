var assert = require('assert');
var express = require('express');

var mortimer = require('./../');
var fixtures = require('./fixtures');


var app = express.createServer();
debugger;


describe('mortimer api', function () {

	before( function (next) {
		var that = this;
		var author = new fixtures.Author({
			'name': 'Lev Tolstoi',
			'nationality': 'russian'
		});
		var book = new fixtures.Book({
			'title': 'War and Peace',
			'author': author
		});
		author.books.push(book);

		this.author = author;
		this.book = book;

		next();
	});
	
	it('should print an Author Object as a plain Object', function () {
		var book = this.book.toObject();
		var author = this.author.toObject();

		assert.ok(author._id, 'should have an id');
		assert.equal(author.name, 'Lev Tolstoi');
		assert.equal(author.nationality, 'russian', 'should have a prop even if it is not in the schema');
		assert.ok( author.books[0], book._id, 'should have a the correct book');
	});	

	it('shold print an Book as a plain Object', function () {
		var book = this.book.toObject();
		var author = this.author.toObject();
		assert.ok(book._id, 'should have an id');
		assert.equal(book.title, 'War and Peace');
		assert.equal(book.author.toString(), author._id.toString(), 'should have the correct author');
	});	

	it('should generate correct api url for author model', function () {
		var Author = fixtures.Author;		
		var url = mortimer.getApiUrl({model: Author});
		assert.equal(url, '/api/v1/authors');
	});

	it('should generate correct api url for author model with id', function () {
		var Author = fixtures.Author;
		var url = mortimer.getApiUrl({
			model: Author,
			withId: true
		});
		assert.equal(url, '/api/v1/authors/:authorId');
	});

	it('should generate correct api url for author model with id and associate book', function () {
		var Book = fixtures.Book;
		var Author = fixtures.Author;
		var url = mortimer.getApiUrl({
			model: Author,
			withId: true,
			associate: Book
		});
		assert.equal(url, '/api/v1/authors/:authorId/books');
	});

	it('should generate correct api url for author model with id and associate book with id', function () {
		var Book = fixtures.Book;
		var Author = fixtures.Author;
		var url = mortimer.getApiUrl({
			model: Author,
			withId: true,
			associate: Book,
			withAssociateId: true
		});
		assert.equal(url, '/api/v1/authors/:authorId/books/:bookId');
	});

});
