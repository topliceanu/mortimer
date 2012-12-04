var assert = require('assert');

var fixtures = require('./fixtures/');
var Resource = require('./../lib/Resource.js');


describe('Resource Class', function () {

	before( function (done) {
		var that = this;

		this.bookRes = new Resource(fixtures.Book);
		this.authorRes = new Resource(fixtures.Author);

        fixtures.before(done);
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
		var book = fixtures.book1;
		var params = {};
		params.action = 'GET';
		params.id = book.id;

		return this.bookRes.execute(params, function (err, data) {
			if (err) return next(err);
            assert.equal(data.code, 200, 'Ok');
			assert.equal(data.message.id, book.id, 'Correct id');
		    assert.equal(data.message.title, book.title, 'Correct title');
		    assert.equal(data.message.author, book.author.toString(), 'Correct author');
			return next();
		});
	});


	it('should retrieve only the book title', function (next) {
		var book = fixtures.book1;
		var params = {};
		params.action = 'GET';
		params.id = book.id;
		params.fields = ['title'];

		return this.bookRes.execute(params, function (err, data) {
			if (err) return next(err);
            assert.equal(data.code, 200, 'Ok');
			assert.equal(data.message.id, book.id, 'filterd out props should be missing');
			assert.equal(data.message.title, book.title, 'filterd out props should be missing');
			assert.equal(data.message.author, undefined, 'filterd out props should be missing');
			return next();
		});
	});


	it('should create a new record', function (next) {
		var author = fixtures.author.id;
		var params = {};
		params.action = 'POST';
		params.body = {};
		params.body.title = 'Novels';
		params.body.author = fixtures.author.id.toString();

		return this.bookRes.execute(params, function (err, data) {
			if (err) return next(err);
            assert.equal(data.code, 201, 'Created');
			assert.equal(data.message.title, 'Novels', 'should have the correct title');
			assert.equal(data.message.author, fixtures.author.id, 'should have the correct author');
			return next();
		});
	});


	it('should update an existing record', function (next) {
		var book = fixtures.book1;
		var params = {};
		params.id = book.id;
		params.action = "PUT";
		params.body = {};
		params.body.title = 'Novels';

		return this.bookRes.execute(params, function (err, data) {
			if (err) return next(err);
            assert.equal(data.code, 200, 'Ok');
			assert.equal(data.message.id, book.id, 'should have the same id');
			assert.equal(data.message.author, book.author.toString(), 'should have the same author');
			assert.equal(data.message.title, 'Novels', 'only the title changes');
			return next();
		});
	});


	it('should delete an existing record', function (next) {
		var book = fixtures.book1;
		var params = {};
		params.id = book.id;
		params.action = "DELETE";

		return this.bookRes.execute(params, function (err, data) {
			if (err) return next(err);
            assert.equal(data.code, 204, 'Empty');
			assert.equal(data.message, undefined);
			fixtures.Book.findById(params.id, function (err, book) {
				if (err) throw err;
				if (book) throw new Error('this book should have been deleted');
				return next();
			});
		});
	});


	it('should list list all book title, no authors', function (next) {
		var params = {};
		params.action = "GET";
		params.pagination = {};
		params.pagination.limit = 1;
		params.pagination.offset = 0;
		params.fields = ['title'];
		params.filters = {};
		params.filters.author = fixtures.author.id;

		return this.bookRes.execute(params, function (err, books) {
			if (err) return next(err);
            assert.equal(books.code, 200, 'Ok');
			assert.equal(books.message.length, 1, 'the pagination should work');
			assert.equal(books.message[0].title, fixtures.book2.title, 'select fields should work');
			assert.equal(books.message[0].author, undefined, 'select filters should work');
			return next();
		});
	});


	it('should update all books', function (next) {
		var params = {};
		params.action = "PUT";
		params.filters = {};
		params.filters.author = fixtures.author.id;
		params.body = {};
		params.body.title = "Test Title";

		return this.bookRes.execute(params, function (err, books) {
			if (err) return next(err);
            assert.equal(books.code, 200, 'Ok');
			books.message.forEach( function (book) {
				assert.equal(book.title, 'Test Title', 'should all have changed titles');
			});
			return next();
		});
	});


	it('should remove all books', function (next) {
		var params = {};
		params.action = "DELETE";
		params.filters = {};
		params.filters.author = fixtures.author.id;

		return this.bookRes.execute(params, function (err, data) {
			if (err) return next(err);
            assert.equal(data.code, 204, 'Empty');
			assert.equal(data.message, undefined);
			return next();
		});
	});


	after(fixtures.after);
});
