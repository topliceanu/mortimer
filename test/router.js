var assert = require('assert');
var express = require('express');
var request = require('supertest');

var Mortimer = require('./../');
var fixtures = require('./fixtures');



// Setup mortimer to handle rest endpoints.
var app = express();
var mortimer = new Mortimer({base: '/api', version: 'v1'});
app.use(express.bodyParser());
mortimer.router(fixtures.Book).bind(app);
mortimer.router(fixtures.Author).bind(app);


describe( 'Router.js', function () {

	beforeEach(fixtures.before);


	it('GET /api/v1/books/:bookId', function (done) {
        var that = this;
        request(app)
            .get('/api/v1/books/'+this.book1.id)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.id, that.book1.id);
                assert.equal(res.body.title, that.book1.title);
                assert.equal(res.body.author, that.book1.author.toString());
                return done();
            });
    });


	it('POST /api/v1/books/:bookId should not work', function (done) {
        var that = this;
        var fakeData = {
            title: 'Fake Title',
            author: that.author.id.toString()
        };
        request(app)
            .post('/api/v1/books/'+that.book1.id)
            .set('Content-Type', 'application/json')
            .send(fakeData)
            .expect(403, 'Forbidden')
            .end(done);
    });


	it('PUT /api/v1/books/:bookId', function (done) {
        var that = this;
        var modify = {
            title: 'War and Peace, Second Edition'
        };
        request(app)
            .put('/api/v1/books/'+that.book1.id)
            .set('Content-Type', 'application/json')
            .send(modify)
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.id, that.book1.id, 'Preserves the id.');
                assert.equal(res.body.title, modify.title, 'Changes the title.');
                assert.equal(res.body.author, that.book1.author.toString(), 'Same author id');
                return done();
            });
    });


	it('DELETE /api/v1/books/:bookId', function (done) {
        var that = this;
        var bookId = that.book1.id.toString();
        request(app)
            .del('/api/v1/books/'+bookId)
            .set('Accept', 'application/json')
            .expect(204, '')
            .end( function (err) {
                if (err) return done(err);

                // Check the database.
                fixtures.Book.findById(bookId).exec( function (err, doc) {
                    if (err) return done(err);
                    return done(null, doc === undefined);
                });
            });
    });


	it('GET /api/v1/books', function (done) {
        var that = this;
        request(app)
            .get('/api/v1/books')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.length, 3);
                for (var i = 0, n = res.body.length; i<n; i ++) {
                    var book = that['book'+(i+1)];
                    assert.equal(res.body[i].id, book.id.toString());
                    assert.equal(res.body[i].title, book.title);
                    assert.equal(res.body[i].author, book.author.toString());
                }
                return done();
            });
	});


	it('POST /api/v1/books', function (done) {
        var that = this;
        var book4 = {
            title: 'Novels',
            author: that.author.id.toString()
        };
        request(app)
            .post('/api/v1/books')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send(book4)
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 201, 'Resource Created');
                assert.ok(res.body.id, 'Id allocated');
                assert.equal(res.body.title, book4.title, 'Same title');
                assert.equal(res.body.author, book4.author, 'Same author id');
                return done();
            });
	});


	it('PUT /api/v1/books', function (done) {
        var that = this;
        var modify = {
            title: 'Uniform Title'
        };
        request(app)
            .put('/api/v1/books')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send(modify)
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                for (var i = 0, n = res.body.length; i < n; i ++) {
                    var book = that['book'+(i+1)];
                    assert.equal(res.body[i].id, book.id.toString());
                    assert.equal(res.body[i].title, modify.title);
                    assert.equal(res.body[i].author, book.author.toString());
                }
                return done();
            });
	});


	it('DELETE /api/v1/books', function (done) {
        request(app)
            .del('/api/v1/books')
            .expect(204, '')
            .end(function (err) {
                if (err) return done(err);

                return fixtures.Book.find().exec( function (err, docs) {
                    if (err) return done(err);
                    return done(null, docs === undefined);
                });
            });
	});


    it('GET /api/v1/authors/:authorId - retrieve books as array of ids', function (done) {
        var that = this;
        request(app)
            .get('/api/v1/authors/'+this.author.id)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.id, that.author.id);
                assert.equal(res.body.name, that.author.name);
                assert.equal(res.body.books.length, 3);
                for (var i = 0, n = res.body.books.length; i<n; i ++) {
                    debugger;
                    var book = that['book'+(i+1)];
                    var bookIsRetrieved = res.body.books.indexOf(book.id) >= 0;
                    assert.equal(true, bookIsRetrieved);
                }
                return done();
            });
    });


	afterEach(fixtures.after);
});
