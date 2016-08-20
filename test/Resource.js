const http = require('http');

const bodyParser = require('body-parser');
const chai = require('chai');
const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');

const fixture = require('./fixture');
const Resource = require('../lib/Resource');

const Book = fixture.Book;

const serialize = (mongooseObject) => {
    return JSON.parse(JSON.stringify(mongooseObject));
};

mongoose.Promise = global.Promise;

describe('Resource', () => {
    before(() => {
        this.rest = new Resource(Book);

        this.app = express();
        this.app.set('query parser', 'simple');
        this.app.use(bodyParser.json());

        this.app.get('/books/count', this.rest.countDocs());
        this.app.get('/books/:bookId', this.rest.readDoc());
        this.app.patch('/books/:bookId', this.rest.patchDoc());
        this.app.put('/books/:bookId', this.rest.putDoc());
        this.app.delete('/books/:bookId', this.rest.removeDoc());
        this.app.get('/books', this.rest.readDocs());
        this.app.patch('/books', this.rest.patchDocs());
        this.app.post('/books', this.rest.createDoc());
        this.app.delete('/books', this.rest.removeDocs());

        this.server = http.createServer(this.app);
    });

    beforeEach((done) => {
        this.book1 = new Book({
            title: 'book1',
            author: 'author1',
            details: {
                numPages: 300
            }
        });
        this.book2 = new Book({
            title: 'book2',
            author: 'author1',
            details: {
                numPages: 400
            }
        });
        Promise.all([
            this.book1.save(),
            this.book2.save(),
        ]).then(() => done(), done);
    });

    afterEach((done) => {
        Book.collection.remove().then(() => done(), done);
    });

    describe('.createDoc()', () => {
        it('should create a new book record', (done) => {
            const payload = {
                title: 'book3',
                author: 'author1'
            };

            // Call the http endpoint.

            new Promise((resolve, reject) => {
                request(this.server)
                    .post('/books')
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(payload)
                    .end((err, res) => {
                        if (err) return reject(err);
                        return resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 201,
                    'should succesfully create a new book');
                chai.assert.isDefined(res.body.data._id,
                    'should return the id');
                chai.assert.equal(res.body.data.title, payload.title,
                    'should return the books title');
                chai.assert.equal(res.body.data.author, payload.author,
                    'should return the books author');

                // Check in the database.
                return Book.findOne()
                    .where('title').equals(payload.title)
                    .where('author').equals(payload.author)
                    .exec();
            }).then((newBook) => {
                chai.assert.isNotNull(newBook,
                    'should have stored the new book');
            }).then(()=> done(), done);
        });

        it('should not add a new book because of bad input data', (done) => {
            const payload = {
                name: 'book3',
                writer: 'author1'
            };

            // Call the http endpoint.
            new Promise((resolve, reject) => {
                request(this.server)
                    .post('/books')
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(payload)
                    .end((err, res) => {
                        if (err) return reject(err);
                        return resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 500, 'bad input data');
                // Check in the database.
                return Book.count().exec();
            }).then((numBooks) => {
                chai.assert.equal(numBooks, 2,
                    'should have found only the original 2 books');
            }).then(() => done(), done);
        });
    });

    describe('.readDoc()', () => {
        it('should return an existing book record', (done) => {
            new Promise((resolve, reject) => {
                request(this.server)
                    .get(`/books/${this.book1._id}`)
                    .set('Accept', 'application/json')
                    .end((err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 200, 'Ok');
                chai.assert.equal(res.body.data.title, this.book1.title,
                    'correct title');
                chai.assert.equal(res.body.data.author, this.book1.author,
                    'correct author');
            }).then(() => done(), done);
        });

        it('should return 404 not found when id does not exist', (done) => {
            new Promise((resolve, reject) => {
                request(this.server)
                    .get('/books/123456781234567812345678')
                    .set('Accept', 'application/json')
                    .end((err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 404, 'Ok');
            }).then(() => done(), done);
        });

        describe('.fields() modifier', () => {
            it('should only return fields of interest', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get(`/books/${this.book1._id}?_fields=title`)
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200, 'Ok');
                    chai.assert.deepEqual(res.body.meta, {'_fields': 'title'},
                        'should return back the query params');
                    chai.assert.equal(res.body.data.title, this.book1.title,
                        'correct title');
                    chai.assert.isUndefined(res.body.data.author,
                        'does not return author because it was not requested');
                }).then(() => done(), done);
            });
        });
    });

    describe('.patchDoc()', () => {
        it('should patch an existing book record', (done) => {
            const payload = {
                title: 'book3'
            };
            new Promise((resolve, reject) => {
                request(this.server)
                    .patch(`/books/${this.book1._id}`)
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(payload)
                    .end((err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 200, 'update should work ok');
                chai.assert.equal(res.body.data.title, payload.title,
                    'should return the new book title');
                chai.assert.equal(res.body.data.author, this.book1.author,
                    'should return the old book author');

                // Check in the database.
                return Book.findOne()
                    .where('_id').equals(this.book1._id)
                    .exec();
            }).then((updatedBook) => {
                chai.assert.equal(updatedBook.title, payload.title,
                    'should have persisted the changes');
                chai.assert.equal(updatedBook.author, this.book1.author,
                    'book document should not be changed');
            }).then(() => done(), done);
        });

        it('should return 500 for a failed update', (done) => {
            const payload = {
                title: null // `title` is expected to be a string.
            };
            new Promise((resolve, reject) => {
                request(this.server)
                    .patch(`/books/${this.book1._id}`)
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(payload)
                    .end((err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 500,
                    'should return an error');

                // Check in the database.
                return Book.findOne()
                    .where('_id').equals(this.book1._id)
                    .exec();
            }).then((book) => {
                chai.assert.equal(book.title, this.book1.title,
                    'should have remained to the old version of title');
            }).then(() => done(), done);
        });
    });

    describe('.putDoc()', () => {
        it('should replace existing resource with request body', (done) => {
            const payload = {
                title: 'book11',
                author: 'author11'
            };
            new Promise((resolve, reject) => {
                request(this.server)
                    .put(`/books/${this.book1._id}`)
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(payload)
                    .end((err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 200, 'should return an error');
                chai.assert.equal(res.body.data.title, payload.title);
                chai.assert.equal(res.body.data.author, payload.author);
                chai.assert.isUndefined(res.body.data.details,
                    'should no longer have details');

                // Check in the database.
                return Book.findOne()
                    .where('_id').equals(this.book1._id)
                    .exec();
            }).then((book) => {
                chai.assert.equal(book.title, payload.title);
                chai.assert.equal(book.author, payload.author);
                chai.assert.isUndefined(book.details,
                    'should no longer have details');
            }).then(() => done(), done);
        });
    });

    describe('.removeDoc()', () => {
        it('should remove an existing book record', (done) => {
            new Promise((resolve, reject) => {
                request(this.server)
                    .del(`/books/${this.book1._id}`)
                    .end((err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 204,
                    'delete should have worked');
                chai.assert.deepEqual(res.body, {},
                    'delete should return empty payload');

                return new Promise((resolve, reject) => {
                    request(this.server)
                        .get(`/books/${this.book1._id}`)
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 404,
                    'should not find any book');

                // Check in the database.
                return Book.findOne()
                    .where('_id').equals(this.book1._id)
                    .exec();
            }).then((book) => {
                chai.assert.isNull(book, 'should not find the book');
            }).then(() => done(), done);
        });
    });

    describe('.readDocs()', () => {
        it('should return all existing book records', (done) => {
            new Promise((resolve, reject) => {
                request(this.server)
                    .get('/books')
                    .set('Accept', 'application/json')
                    .end((err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 200, 'update should work ok');
                chai.assert.deepEqual(res.body.meta, {}, 'no meta data is returned');
                chai.assert.lengthOf(res.body.data, 2, 'should return two objects');
                chai.assert.deepEqual(res.body.data[0], serialize(this.book1),
                    'should return the first book');
                chai.assert.deepEqual(res.body.data[1], serialize(this.book2),
                    'should return the second book');
            }).then(() => done(), done);
        });

        describe('.pagination() modifier', () => {

            it('should be able to paginate results', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?_skip=1&_limit=1')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta, {'_skip': '1', '_limit': '1'},
                        'should return the metadata from the request');
                    chai.assert.lengthOf(res.body.data, 1,
                        'should return only the second book');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book2),
                        'should return the books contents');
                }).then(() => done(), done);
            });

            it('should fallback to default page size for documents', (done) => {
                // Checks if default value of pagination
                // offset and limit is respected, ie. it doesn't return
                // the entire collection on a GET.
                const insertedBooks = [...Array(20).keys()].map((index) => {
                    // Insert a book and returns a promise so we can chain it.
                    return new Book({
                        title: `book${index}`,
                        author: `author${index}`
                    }).save();
                });

                Promise.all(insertedBooks).then(() => {
                    return new Promise((resolve, reject) => {
                        request(this.server)
                            .get('/books')
                            .set('Accept', 'application/json')
                            .end((err, res) => {
                                if (err) reject(err);
                                else resolve(res);
                            });
                    }).then((res) => {
                        chai.assert.equal(res.statusCode, 200,
                            'should return the correct value');
                        chai.assert.lengthOf(res.body.data, 10,
                            'should return only the first page of documents');
                        const expectedTitles = [...Array(10).keys()].map((i) => `book${i}`);
                        const actualTitles = res.body.data.map((b) => b.title);
                        chai.assert.includeMembers(expectedTitles, actualTitles,
                            'should fetch only the first inserted books');
                    }).then(() => done(), done);
                });
            });
        });

        describe('.filters() modifier', () => {

            it('__eq filters by field value', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?title__eq=book1')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta, {'title__eq': 'book1'},
                        'should return back the fitler');
                    chai.assert.lengthOf(res.body.data, 1,
                        'should return only the first book');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book1),
                        'should return the first book');
                }).then(() => done(), done);
            });

            it('__eq is default filter when non is specified', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?title=book1')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta, {'title': 'book1'},
                        'should return back the fitler');
                    chai.assert.lengthOf(res.body.data, 1,
                        'should return only the first book');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book1),
                        'should return the first book');
                }).then(() => done(), done);
            });

            it('__ne filter acts as not equal to value', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?title__ne=book1')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta, {'title__ne': 'book1'},
                        'should return back the fitler');
                    chai.assert.lengthOf(res.body.data, 1,
                        'should return only the first book');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book2),
                        'should return the first book');
                }).then(() => done(), done);
            });

            it('__gt filter acts as strictly greater than', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?details.numPages__gt=350')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta, {'details.numPages__gt': '350'},
                        'should return back the fitler');
                    chai.assert.lengthOf(res.body.data, 1,
                        'should return only the first book');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book2),
                        'should return the first book');
                }).then(() => done(), done);
            });

            it('__gte filter acts as greater than or equal to', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?details.numPages__gte=400')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta, {'details.numPages__gte': '400'},
                        'should return back the fitler');
                    chai.assert.lengthOf(res.body.data, 1,
                        'should return only the first book');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book2),
                        'should return the first book');
                }).then(() => done(), done);
            });

            it('__lt filter acts as strictly less than', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?details.numPages__lt=350')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta, {'details.numPages__lt': '350'},
                        'should return back the fitler');
                    chai.assert.lengthOf(res.body.data, 1,
                        'should return only the first book');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book1),
                        'should return the first book');
                }).then(() => done(), done);
            });

            it('__lte filter acts as less than or equal to', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?details.numPages__lte=300')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta, {'details.numPages__lte': '300'},
                        'should return back the fitler');
                    chai.assert.lengthOf(res.body.data, 1,
                        'should return only the first book');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book1),
                        'should return the first book');
                }).then(() => done(), done);
            });

            it('__in should be able to return documents with value within a list', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get(`/books?_id__in=${this.book1._id},${this.book2._id}`)
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200, 'update should work ok');
                    chai.assert.deepEqual(res.body.meta,
                        {_id__in: `${this.book1._id},${this.book2._id}`},
                        'added metadata to the response');
                    chai.assert.lengthOf(res.body.data, 2, 'should return two objects');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book1),
                        'should return the first book');
                    chai.assert.deepEqual(res.body.data[1], serialize(this.book2),
                        'should return the second book');
                }).then(() => done(), done);
            });

            it('__regex should support filtering by regular expr', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?title__regex=k1')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta,
                        {'title__regex': 'k1'},
                        'added metadata to the response');
                    chai.assert.lengthOf(res.body.data, 1,
                        'returns only the first book which has one in title');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book1),
                        'should return the correct book');
                }).then(() => done(), done);
            });
        });

        describe('.sort() modifier', () => {

            it('should order results descending by the given param', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?_sort=-title')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.deepEqual(res.body.meta,
                        {'_sort': '-title'},
                        'added metadata to the response');
                    chai.assert.lengthOf(res.body.data, 2,
                        'should return both book sorted by title');
                    chai.assert.deepEqual(res.body.data[0], serialize(this.book2),
                        'second book returnd is the first one');
                    chai.assert.deepEqual(res.body.data[1], serialize(this.book1),
                        'first book returned is the second one');
                }).then(() => done(), done);
            });
        });

        describe('.fields() modifier', () => {
            it('should be able to select only specific fields', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books?_fields=title')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200,
                        'should return the correct value');
                    chai.assert.lengthOf(res.body.data, 2,
                        'should return both book records');
                    chai.assert.equal(res.body.data[0].title, this.book1.title,
                        'title field should be populated');
                    chai.assert.isUndefined(res.body.data[0].author,
                        'author field should not be populated');
                    chai.assert.equal(res.body.data[1].title, this.book2.title,
                        'title fields should be populated');
                    chai.assert.isUndefined(res.body.data[1].author,
                        'author field should not be populated');
                }).then(() => done(), done);
            });
        });
    });

    describe('.removeDocs()', () => {

        describe('.filter() modifier', () => {

            it('should remove the documents selected by the query', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .delete('/books?title__regex=1')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200, 'should have worked ok');

                    // Check the database.
                    return Book.find().exec();
                }).then((books) => {
                    chai.assert.lengthOf(books, 1,
                        'should have removed the matching documents');
                    chai.assert.equal(books[0]._id.toString(), this.book2._id.toString(),
                        'should have kept the book that does not match the filters');
                }).then(() => done(), done);
            });
        });
    });

    describe('.patchDocs()', () => {

        describe('.filter() modifier', () => {

            it('should update all selected books', (done) => {
                const payload = {
                    author: 'author11'
                };
                new Promise((resolve, reject) => {
                    request(this.server)
                        .patch('/books?author__eq=author1')
                        .set('Content-Type', 'application/json')
                        .set('Accept', 'application/json')
                        .send(payload)
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200, 'should have worked ok');
                    chai.assert.deepEqual(res.body.meta,
                        {'author__eq': 'author1'},
                        'added metadata to the response');

                    // Check the database.
                    return Book.find().exec();
                }).then((books) => {
                    chai.assert.lengthOf(books, 2,
                        'should have the same number of books');
                    chai.assert.equal(books[0].author, payload.author,
                        'should have updated the first book');
                    chai.assert.equal(books[1].author, payload.author,
                        'should have updated the second book');
                }).then(() => done(), done);
            });
        });
    });

    describe('.countDocs()', () => {

        it('should return a count of all books', (done) => {
            new Promise((resolve, reject) => {
                request(this.server)
                    .get('/books/count')
                    .set('Accept', 'application/json')
                    .end((err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
            }).then((res) => {
                chai.assert.equal(res.statusCode, 200, 'update should work ok');
                chai.assert.deepEqual(res.body.meta, {},
                    'no filters were used');
                chai.assert.equal(res.body.data, 2,
                    'should count all the books in the database');
            }).then(() => done(), done);
        });

        describe('.filter() modifier', () => {

            it('should return the book count given a filter', (done) => {
                new Promise((resolve, reject) => {
                    request(this.server)
                        .get('/books/count?title=book1')
                        .set('Accept', 'application/json')
                        .end((err, res) => {
                            if (err) reject(err);
                            else resolve(res);
                        });
                }).then((res) => {
                    chai.assert.equal(res.statusCode, 200, 'update should work ok');
                    chai.assert.deepEqual(res.body.meta, {'title': 'book1'},
                        'should return the filters used');
                    chai.assert.equal(res.body.data, 1,
                        'should count only one book for that filter');
                }).then(() => done(), done);
            });
        });
    });
});
