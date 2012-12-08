var assert = require('assert');
var express = require('express');
var request = require('supertest');

var Mortimer = require('./../');
var fixtures = require('./fixtures');

var app = express();
app.use(express.bodyParser());


// Prepare fake header.
var header = {
    key: 'Fake-Header',
    value: 'test-value'
};
var applyHeader = function (req, res, next) {
    res.set(header.key, header.value);
    return next();
};
var mortimer = new Mortimer({
    base: '/api',
    version: 'v1',
    pre: applyHeader
});

app.get('/api/v1/books/:bookId', mortimer.middleware(fixtures.Book, 'read'));
app.get('/api/v1/authors/:authorId', mortimer.read(fixtures.Author));



describe('Resource Class', function () {


	beforeEach(fixtures.before);


    it('test the middleware generic function for read verb', function (done) {
        var that = this;
        request(app)
            .get('/api/v1/books/'+that.book1.id)
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


    it('test the action middleware function', function (done) {
        var that = this;
        request(app)
            .get('/api/v1/authors/'+that.author.id)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.id, that.author.id.toString());
                assert.equal(res.body.name, that.author.name);
                return done();
            });
    });


    it('test that there is no other endpoint added', function (done) {
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
                assert.equal(res.statusCode, 404);
                return done();
            });
    });


    it('test if the `pre` middleware arrays work', function (done) {
        var that = this;
        request(app)
            .get('/api/v1/authors/'+that.author.id)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(header.key, header.value)
            .end( function (err, res) {
                if (err) return done(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.body.id, that.author.id.toString());
                assert.equal(res.body.name, that.author.name);
                return done();
            });
    });


    it('make sure the api does not return undefined value in arrays or object', function (done) {
        // Remove the name to see if the api retrieves it.
        var that = this;
        that.author.type = undefined;
        that.author.save( function (err) {
            if (err) return done(err);
            request(app)
                .get('/api/v1/authors/'+that.author.id)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end( function (err, res) {
                    if (err) return done(err);
                    assert.equal(res.statusCode, 200);
                    assert.equal(res.body.id, that.author.id.toString());
                    assert.equal(res.body.name, that.author.name);
                    assert.ok(!res.body.hasOwnProperty('type'))
                    return done();
                });
        });
    });


	afterEach(fixtures.after);
});
