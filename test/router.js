var assert = require('assert');
var express = require('express');
var request = require('supertest');

var Mortimer = require('./../');
var fixtures = require('./fixtures');



// Setup mortimer to handle rest endpoints.
var app = express();
var mortimer = new Mortimer({base: '/api', version: 'v1'});
mortimer.router(fixtures.Book).bind(app);
mortimer.router(fixtures.Author).bind(app);


describe( 'Router.js', function () {

	before(fixtures.before);


	it('GET /api/v1/books/'+fixtures.book1.id, function (done) {
        request(app)
            .get('/api/v1/books/'+fixtures.book1.id)
            .set('Content-Type', 'application/json')
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.id, fixtures.book1.id);
                assert.equal(res.body.title, fixtures.book1.title);
                assert.equal(res.body.author, fixtures.book1.author.toString());
                return done();
            });
    });


	it('POST /api/v1/books/'+fixtures.book1.id, function (done) {
        var fakeData = {
            title: 'Fake Title',
            author: fixtures.author.id.toString()
        };
        request(app)
            .post('/api/v1/books/'+fixtures.book1.id)
            .send(fakeData)
            .expect(403, 'Forbidden')
            .end(done);
    });

	it('PUT /api/v1/books/'+fixtures.book1.id, function (done) {
        var modify = {
            title: 'War and Peace, Second Edition'
        };
        request(app)
            .put('/api/v1/books/'+fixtures.book1.id)
            .send(modify)
            .set('Accept', 'application/json')
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.id, fixtures.book1.id, 'Preserves the id.');
                assert.equal(res.body.title, modify.title, 'Changes the title.');
                assert.equal(res.body.author, fixtures.book1.author, 'Same author id');
                return done();
            });
    });


/*
	it('DELETE /api/v1/books/'+fixtures.book1.id, function (done) {
        request(app)
            .del('/api/v1/books/'+fixtures.book1.id)
            .set('Accept', 'application/json')
            .expect(204)
            .end(done);
        //TODO check the database
    });


	it('GET /api/v1/books', function (done) {
        request(app)
            .get('/api/v1/books')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.length, 3);
                for (var i = 0, n = res.body.length; i<n; i ++) {
                    var book = fixtures['book'+(i+1)];
                    assert.equal(res.body[i].id, book.id.toString());
                    assert.equal(res.body[i].title, book.title);
                    assert.equal(res.body[i].author, book.author.toString());
                }
                return done();
            });
	});


	it('POST /api/v1/books', function (done) {
        var book4 = {
            title: 'Novels',
            author: fixtures.author.id.toString()
        };
        request(app)
            .post('/api/v1/books')
            .send(book4)
            .set('Accept', 'application/json')
            .end( function (err, res) {
                debugger;
                if (err) return done(err);
                assert.equal(res.statusCode, 201, 'Resource Created');
                assert.ok(res.body.id, 'Id allocated'); 
                assert.equal(res.body.title, book4.title, 'Same title');
                assert.equal(res.body.author, book4.author, 'Same author id');
            });
	});


	it('PUT /api/v1/books', function (done) {
        var modify = {
            title: 'Uniform Title'
        };
        request(app)
            .put('/api/v1/books')
            .send(modify)
            .set('Accept', 'application/json')
            .expect(200)
            .end( function (err, res) {
                if (err) return done(err);
                for (var i = 0, n = res.body.length; i < n; i ++) {
                    var book = fixtures['book'+(i+1)];
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
            .expect(204)
            .end(done);
        //TODO check the database
	});
*/

	after(fixtures.after);
});
