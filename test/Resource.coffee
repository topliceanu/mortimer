http = require 'http'

_ = require 'underscore'
bodyParser = require 'body-parser'
chai = require 'chai'
express = require 'express'
mongoose = require 'mongoose'
request = require 'supertest'
Q = require 'q'

fixture = require './fixture'
Resource = require '../src/Resource'


{assert} = chai
{Book} = fixture

serialize = (mongooseObject) ->
    JSON.parse JSON.stringify mongooseObject

describe 'Resource', ->

    before ->
        @rest = new Resource Book

        @app = express()
        @app.set 'query parser', 'simple'
        @app.use bodyParser.json()

        @app.get '/books/count', @rest.countDocs()
        @app.get '/books/:bookId', @rest.readDoc()
        @app.patch '/books/:bookId', @rest.patchDoc()
        @app.put '/books/:bookId', @rest.putDoc()
        @app.delete '/books/:bookId', @rest.removeDoc()
        @app.get '/books', @rest.readDocs()
        @app.post '/books', @rest.createDoc()

        @server = http.createServer @app

    beforeEach (done) ->
        @book1 = new Book
            title: 'book1'
            author: 'author1'
            details:
                numPages: 300
        @book2 = new Book
            title: 'book2'
            author: 'author1'
            details:
                numPages: 400
        Q.all([
            Q.ninvoke @book1, 'save'
            Q.ninvoke @book2, 'save'
        ]).then (-> done()), done

    afterEach (done) ->
        (Q.ninvoke Book.collection, 'remove').then (-> done()), done


    describe '.createDoc()', ->

        it 'should create a new book record', (done) ->
            payload =
                title: 'book3'
                author: 'author1'

            # Call the http endpoint.
            call = request(@server)
                .post("/books")
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send(payload)
            (Q.ninvoke call, 'end').then (res) ->
                assert.equal res.statusCode, 201,
                    'should succesfully create a new book'
                assert.isDefined res.body.data._id,
                    'should return the id'
                assert.equal res.body.data.title, payload.title,
                    'should return the books title'
                assert.equal res.body.data.author, payload.author,
                    'should return the books author'

                # Check in the database.
                query = Book.findOne()
                    .where('title').equals(payload.title)
                    .where('author').equals(payload.author)
                Q.ninvoke query, 'exec'
            .then (newBook) ->
                assert.isNotNull newBook,
                    'should have stored the new book'
            .then (-> done()), done

        it 'should not a new book because of bad input data', (done) ->
            payload =
                name: 'book3'
                writer: 'author1'

            # Call the http endpoint.
            call = request(@server)
                .post("/books")
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send(payload)
            (Q.ninvoke call, 'end').then (res) ->
                assert.equal res.statusCode, 500,
                    'bad input data'

                # Check in the database.
                Q.ninvoke Book.count(), 'exec'
            .then (numBooks) ->
                assert.equal numBooks, 2,
                    'should have found only the original 2 books'
            .then (-> done()), done


    describe '.readDoc()', ->

        it 'should return an existing book record', (done) ->
            call = request(@server)
                .get("/books/#{@book1._id}")
                .set('Accept', 'application/json')
            (Q.ninvoke call, 'end').then (res) =>
                assert.equal res.statusCode, 200, 'Ok'
                assert.equal res.body.data.title, @book1.title,
                    'correct title'
                assert.equal res.body.data.author, @book1.author,
                    'correct author'
            .then (-> done()), done

        it 'should return 404 not found when id does not exist', (done) ->
            call = request(@server)
                .get("/books/123456781234567812345678")
                .set('Accept', 'application/json')
            (Q.ninvoke call, 'end').then (res) =>
                assert.equal res.statusCode, 404, 'Ok'
            .then (-> done()), done

        describe '.fields() modifier', ->

            it 'should only return fields of interest', (done) ->
                call = request(@server)
                    .get("/books/#{@book1._id}?_fields=title")
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200, 'Ok'
                    assert.deepEqual res.body.meta, {'_fields': 'title'},
                        'should return back the query params'
                    assert.equal res.body.data.title, @book1.title,
                        'correct title'
                    assert.isUndefined res.body.data.author,
                        'does not return author because it was not requested'
                .then (-> done()), done


    describe '.patchDoc()', ->

        it 'should patch an existing book record', (done) ->
            payload =
                title: 'book3'
            call = request(@server)
                .patch("/books/#{@book1._id}")
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send(payload)
            (Q.ninvoke call, 'end').then (res) =>
                assert.equal res.statusCode, 200, 'update should work ok'
                assert.equal res.body.data.title, payload.title,
                    'should return the new book title'
                assert.equal res.body.data.author, @book1.author,
                    'should return the old book author'

                # Check in the database.
                query = Book.findOne()
                    .where("_id").equals(@book1._id)
                Q.ninvoke query, 'exec'
            .then (updatedBook) =>
                assert.equal updatedBook.title, payload.title,
                    'should have persisted the changes'
                assert.equal updatedBook.author, @book1.author,
                    'book document should not be changed'
            .then (-> done()), done

        it 'should return 500 for a failed update', (done) ->
            payload =
                title: null # `title` is expected to be a string.
            call = request(@server)
                .patch("/books/#{@book1._id}")
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send(payload)
            (Q.ninvoke call, 'end').then (res) =>
                assert.equal res.statusCode, 500, 'should return an error'

                # Check in the database.
                query = Book.findOne()
                    .where("_id").equals(@book1._id)
                Q.ninvoke query, 'exec'
            .then (book) =>
                assert.equal book.title, @book1.title,
                    'should have remained to the old version of title'
            .then (-> done()), done

    describe '.putDoc()', ->

        it 'should replace existing resource with request body', (done) ->
            payload =
                title: 'book11'
                author: 'author11'
            call = request(@server)
                .put("/books/#{@book1._id}")
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send(payload)
            (Q.ninvoke call, 'end').then (res) =>
                assert.equal res.statusCode, 200, 'should return an error'
                assert.equal req.body.data.title, payload.title
                assert.equal req.body.data.author, payload.author
                assert.isNull req.body.data.details,
                    'should no longer have details'

                # Check in the database.
                query = Book.findOne()
                    .where("_id").equals(@book1._id)
                Q.ninvoke query, 'exec'
            .then (book) =>
                assert.equal book.title, payload.title
                assert.equal book.author, payload.author
                assert.isNull book.details,
                    'should no longer have details'
            .then (-> done()), done


    describe '.removeDoc()', ->

        it 'should remove an existing book record', (done) ->
            Q().then =>
                call = request(@server)
                    .del("/books/#{@book1._id}")
                Q.ninvoke call, 'end'
            .then (res) =>
                assert.equal res.statusCode, 204,
                    'delete should have worked'
                assert.deepEqual res.body, {},
                    'delete should return empty payload'

                call = request(@server)
                    .get("/books/#{@book1._id}")
                    .set('Accept', 'application/json')
                Q.ninvoke call, 'end'
            .then (res) =>
                assert.equal res.statusCode, 404, 'should not find any book'

                # Check in the database.
                query = Book.findOne()
                    .where('_id').equals(@book1._id)
                Q.ninvoke query, 'exec'
            .then (book) ->
                assert.isNull book, 'should not find the book'
            .then (-> done()), done

    describe '.readDocs()', ->

        it 'should return all existing book records', (done) ->
            call = request(@server)
                .get("/books")
                .set('Accept', 'application/json')
            (Q.ninvoke call, 'end').then (res) =>
                assert.equal res.statusCode, 200, 'update should work ok'
                assert.deepEqual res.body.meta, {}, 'no meta data is returned'
                assert.lengthOf res.body.data, 2, 'should return two objects'
                assert.deepEqual res.body.data[0], (serialize @book1),
                    'should return the first book'
                assert.deepEqual res.body.data[1], (serialize @book2),
                    'should return the second book'
            .then (-> done()), done

        describe '.pagination() modifier', ->

            it 'should be able to paginate results', (done) ->
                call = request(@server)
                    .get('/books?_skip=1&_limit=1')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.deepEqual res.body.meta, {'_skip': '1', '_limit': '1'},
                        'should return the metadata from the request'
                    assert.lengthOf res.body.data, 1,
                        'should return only the second book'
                    assert.deepEqual res.body.data[0], (serialize @book2),
                        'should return the books contents'
                .then (-> done()), done

            it 'should fallback to default page size for documents', (done) ->
                ###
                    Checks if default value of pagination
                    offset and limit is respected, ie. it doesn't return
                    the entire collection on a GET.
                ###
                insertedBooks = _.map [1..20], (index) ->
                    # Insert a book and returns a promise so we can chain it.
                    book = new Book
                        title: "book#{index}"
                        author: "author#{index}"
                    Q.ninvoke book, 'save'

                (Q.allSettled insertedBooks).then =>
                    call = request(@server)
                        .get('/books')
                        .set('Accept', 'application/json')
                    (Q.ninvoke call, 'end').then (res) ->
                        assert.equal res.statusCode, 200,
                            'should return the correct value'
                        assert.lengthOf res.body.data, 10,
                            'should return only the first page of documents'
                        expectedTitles = ("book#{i}" for i in [1..10])
                        actualTitles = _.pluck res.body.data, 'title'
                        assert.includeMembers expectedTitles, actualTitles,
                            'should fetch only the first inserted books'
                    .then (-> done()), done

        describe '.filters() modifier', ->

            it '__eq filters by field value', (done) ->
                call = request(@server)
                    .get('/books?title__eq=book1')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.deepEqual res.body.meta, {'title__eq': 'book1'},
                        'should return back the fitler'
                    assert.lengthOf res.body.data, 1,
                        'should return only the first book'
                    assert.deepEqual res.body.data[0], (serialize @book1),
                        'should return the first book'
                .then (-> done()), done

            it '__eq is default filter when non is specified', (done) ->
                call = request(@server)
                    .get('/books?title=book1')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.deepEqual res.body.meta, {'title': 'book1'},
                        'should return back the fitler'
                    assert.lengthOf res.body.data, 1,
                        'should return only the first book'
                    assert.deepEqual res.body.data[0], (serialize @book1),
                        'should return the first book'
                .then (-> done()), done

            it '__gt filter acts as strictly greater than', (done) ->
                call = request(@server)
                    .get('/books?details.numPages__gt=350')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.deepEqual res.body.meta, {'details.numPages__gt': '350'},
                        'should return back the fitler'
                    assert.lengthOf res.body.data, 1,
                        'should return only the first book'
                    assert.deepEqual res.body.data[0], (serialize @book2),
                        'should return the first book'
                .then (-> done()), done

            it '__gte filter acts as greater than or equal to', (done) ->
                call = request(@server)
                    .get('/books?details.numPages__gte=400')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.deepEqual res.body.meta, {'details.numPages__gte': '400'},
                        'should return back the fitler'
                    assert.lengthOf res.body.data, 1,
                        'should return only the first book'
                    assert.deepEqual res.body.data[0], (serialize @book2),
                        'should return the first book'
                .then (-> done()), done

            it '__lt filter acts as strictly less than', (done) ->
                call = request(@server)
                    .get('/books?details.numPages__lt=350')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.deepEqual res.body.meta, {'details.numPages__lt': '350'},
                        'should return back the fitler'
                    assert.lengthOf res.body.data, 1,
                        'should return only the first book'
                    assert.deepEqual res.body.data[0], (serialize @book1),
                        'should return the first book'
                .then (-> done()), done

            it '__lte filter acts as less than or equal to', (done) ->
                call = request(@server)
                    .get('/books?details.numPages__lte=300')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.deepEqual res.body.meta, {'details.numPages__lte': '300'},
                        'should return back the fitler'
                    assert.lengthOf res.body.data, 1,
                        'should return only the first book'
                    assert.deepEqual res.body.data[0], (serialize @book1),
                        'should return the first book'
                .then (-> done()), done

            it '__in should be able to return documents with value within a list', (done) ->
                call = request(@server)
                    .get("/books?_id__in=#{@book1._id},#{@book2._id}")
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200, 'update should work ok'
                    assert.deepEqual res.body.meta,
                        {_id__in: "#{@book1._id},#{@book2._id}"},
                        'added metadata to the response'
                    assert.lengthOf res.body.data, 2, 'should return two objects'
                    assert.deepEqual res.body.data[0], (serialize @book1),
                        'should return the first book'
                    assert.deepEqual res.body.data[1], (serialize @book2),
                        'should return the second book'
                .then (-> done()), done

            it '__regex should support filtering by regular expr', (done) ->
                call = request(@server)
                    .get('/books?title__regex=k1')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.deepEqual res.body.meta,
                        {'title__regex': 'k1'},
                        'added metadata to the response'
                    assert.lengthOf res.body.data, 1,
                        'returns only the first book which has one in title'
                    assert.deepEqual res.body.data[0], (serialize @book1),
                        'should return the correct book'
                .then (-> done()), done

        describe '.sort() modifier', ->

            it 'should order results descending by the given param', (done) ->
                call = request(@server)
                    .get('/books?_sort=-title')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.deepEqual res.body.meta,
                        {'_sort': '-title'},
                        'added metadata to the response'
                    assert.lengthOf res.body.data, 2,
                        'should return both book sorted by title'
                    assert.deepEqual res.body.data[0], (serialize @book2),
                        'second book returnd is the first one'
                    assert.deepEqual res.body.data[1], (serialize @book1),
                        'first book returned is the second one'
                .then (-> done()), done

        describe '.fields() modifier', ->

            it 'should be able to select only specific fields', (done) ->
                call = request(@server)
                    .get('/books?_fields=title')
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) =>
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.lengthOf res.body.data, 2,
                        'should return both book records'
                    assert.equal res.body.data[0].title, @book1.title,
                        'title field should be populated'
                    assert.isUndefined res.body.data[0].author,
                        'author field should not be populated'
                    assert.equal res.body.data[1].title, @book2.title,
                        'title fields should be populated'
                    assert.isUndefined res.body.data[1].author,
                        'author field should not be populated'
                .then (-> done()), done

    describe '.countDocs()', ->

        it 'should return a count of all books', (done) ->
            call = request(@server)
                .get("/books/count")
                .set('Accept', 'application/json')
            (Q.ninvoke call, 'end').then (res) ->
                assert.equal res.statusCode, 200, 'update should work ok'
                assert.deepEqual res.body.meta, {},
                    'no filters were used'
                assert.equal res.body.data, 2,
                    'should count all the books in the database'
            .then (-> done()), done

        describe '.filter() modifier', ->

            it 'should return the book count given a filter', (done) ->
                call = request(@server)
                    .get("/books/count?title=book1")
                    .set('Accept', 'application/json')
                (Q.ninvoke call, 'end').then (res) ->
                    assert.equal res.statusCode, 200, 'update should work ok'
                    assert.deepEqual res.body.meta, {'title': 'book1'},
                        'should return the filters used'
                    assert.equal res.body.data, 1,
                        'should count only one book for that filter'
                .then (-> done()), done
