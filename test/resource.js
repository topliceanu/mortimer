var assert = require('assert');

var fixtures = require('./fixtures/');
var Resource = require('./../lib/Resource.js');


describe('Resource Class', function () {

	before( function (next) {
		var that = this;

		this.bookRes = new Resource(fixtures.Book);
		this.authorRes = new Resource(fixtures.Author);

		var author = new fixtures.Author({
			'name': 'Lev Tolstoi',
			'nationality': 'russian'
		});
		author.save( function (err) {
			if (err) throw err;

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
			book1.save( function (err) {
				if (err) throw err;
				book2.save( function (err) {
					if (err) throw err;
					book3.save( function (err) {
						if (err) throw err;

						author.books = [book1, book2, book3];
						author.save( function (err) {
							if (err) throw err;

							that.author = author;
							that.book1 = book1;
							that.book2 = book2;
							that.book3 = book3;
							return next();
						});
					});
				});
			});
		});
	});


	it('should create a correct resource', function () {
		assert.equal(this.bookRes.Model, fixtures.Book, 'should have the correct model');
		assert.equal(this.bookRes.schema, fixtures.Book.schema, 'should have the correct schema');
		assert.equal(this.bookRes.name, 'book', 'should have the correct name');
		assert.equal(this.bookRes.collection, 'books', 'should have the correct collection name');
		assert.equal(this.bookRes.key, 'bookId');
	});	


	it('should produce a correct resource path', function () {
		assert.equal(this.bookRes.path(), '/books', 'collection path');
		assert.equal(this.bookRes.path(true), '/books/:bookId', 'collection path');
	});

	
	it('should retrieve a book record', function (next) {
		var book = this.book1;
		var params = {};
		params.action = 'GET';
		params.id = this.book1.id;

		return this.bookRes.execute(params, function (err, data) {
			if (err) throw err;
			assert.deepEqual({
				id: book.id,
				title: book.title,
				author: book.author.toString()
			}, data, 'should have the correct properties');
			return next();
		});
	});


	it('should retrieve only the book title', function (next) {
		var book = this.book1
		var params = {};
		params.action = 'GET';
		params.id = this.book1.id;
		params.fields = ['title'] 

		return this.bookRes.execute(params, function (err, data) {
			if (err) throw err;
			assert.equal(data.id, book.id, 'filterd out props should be missing');
			assert.equal(data.title, book.title, 'filterd out props should be missing');
			assert.equal(data.author, undefined, 'filterd out props should be missing');
			return next();
		});
	});


	it('should create a new record', function (next) {
		var author = this.author.id;
		var params = {};
		params.action = 'POST';
		params.body = {};
		params.body.title = 'Novels';
		params.body.author = author.id;

		return this.bookRes.execute(params, function (err, data) {
			if (err) throw err;
			assert.equal(data.title, 'Novels', 'should have the correct title');
			assert.equal(data.author, author.id, 'should have the correct author');
			return next();
		});
	});


	it('should update an existing record', function (next) {
		var book = this.book1;
		var params = {};
		params.id = book.id;
		params.action = "PUT";
		params.body = {};
		params.body.title = 'Novels'

		return this.bookRes.execute(params, function (err, data) {
			if (err) throw err;
			assert.equal(data.id, book.id, 'should have the same id');	
			assert.equal(data.author, book.author.toString(), 'should have the same author');
			assert.equal(data.title, 'Novels', 'only the title changes');
			return next();
		});
	});


	it('should delete an existing record', function (next) {
		var book = this.book1	
		var params = {};
		params.id = book.id;
		params.action = "DELETE";

		return this.bookRes.execute(params, function (err, data) {
			if (err) throw err;
			assert.equal(data, undefined);
			fixtures.Book.findById(params.id, function (err, book) {
				if (err) throw err;
				if (book) throw new Error('this book should have been deleted');
				return next();
			});
		});
	});


	it('should list list all books', function (next) {
		var that = this;
		var params = {};
		params.action = "GET";
		params.pagination = {};
		params.pagination.limit = 1;
		params.pagination.offset = 0;
		params.fields = ['title']
		params.filters = {};
		params.filters.author = this.author.id;

		return this.bookRes.execute(params, function (err, books) {
			if (err) throw err;
			assert.equal(books.length, 1, 'the pagination should work');
			assert.equal(books[0].title, that.book2.title, 'select fields should work');
			assert.equal(books[0].author, undefined, 'select filters should work');
			return next();
		});
	});


	it('should update all books', function (next) {
		var params = {};	
		params.action = "PUT";
		params.filters = {};
		params.filters.author = this.author.id;
		params.body = {};
		params.body.title = "Test Title";

		return this.bookRes.execute(params, function (err, books) {
			if (err) throw err;
			books.forEach( function (book) {
				assert.equal(book.title, 'Test Title', 'should all have changed titles');
			});
			return next();
		});
	});


	it('should remove all books', function (next) {
		var params = {};	
		params.action = "DELETE";
		params.filters = {};
		params.filters.author = this.author.id;

		return this.bookRes.execute(params, function (err, data) {
			if (err) throw err;
			assert.equal(data, undefined)
			return next();
		});
	});


	after( function (next) {
		var that = this;
		return fixtures.Author.collection.remove( function () {
			return fixtures.Book.collection.remove( function () {
				return next();
			});
		});
	});

});
