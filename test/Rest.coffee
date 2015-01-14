http = require 'http'

_ = require 'underscore'
bodyParser = require 'body-parser'
chai = require 'chai'
express = require 'express'
mongoose = require 'mongoose'
request = require 'supertest'
Q = require 'q'
qs = require 'qs'

fixture = require './fixture'
Rest = require '../src/Rest'


{assert} = chai
{Book} = fixture

describe 'Rest', ->

    before ->
        @rest = new Rest Book

        @app = express()
        @app.set 'query parser', 'simple'
        @app.use bodyParser.json()

        @app.get '/books/:bookId', @rest.readDoc()
        @app.put '/books/:bookId', @rest.updateDoc()
        @app.patch '/books/:bookId', @rest.patchDoc()
        @app.delete '/books/:bookId', @rest.removeDoc()
        @app.get '/books', @rest.readDocs()
        @app.post '/books', @rest.createDoc()
        @app.get '/books/stream', @rest.streamDocs()
        @app.put '/books', @rest.updateDocs()
        @app.patch '/books', @rest.patchDocs()
        @app.delete '/books', @rest.removeDocs()

        @server = http.createServer @app

    beforeEach (done) ->
        Q().then =>
            @book1 = new Book
                title: 'book1'
                author: 'author1'
            Q.ninvoke @book1, 'save'
        .then =>
            @book2 = new Book
                title: 'book2'
                author: 'author1'
            Q.ninvoke @book2, 'save'
        .then (-> done()), done

    afterEach (done) ->
        (Q.ninvoke Book.collection, 'remove').then (-> done()), done

    describe 'Query Modifiers', ->

        it '_fields() should be able to select only specific fields', (done) ->
            stack = [
                middleware.namespace
                middleware.send()
                (req, res, next) =>
                    req.vt.query = @Book.find()
                    next()
                @rest._fields()
                @rest._execute()
                @rest._publish()
            ]

            @app.get '/fields/1', stack

            request(@server)
                .get('/fields/1?fields=title')
                .set('Accept', 'application/json')
                .end (error, res) =>
                    if error? then return done error
                    assert.equal res.statusCode, 200,
                        'should return the correct value'
                    assert.lengthOf res.body, 2,
                        'should return both book records'
                    assert.equal res.body[0].title, @book1.title,
                        '`title` fields should be populated'
                    assert.isUndefined res.body[0].author,
                        '`author` field should not be populated'
                    assert.equal res.body[1].title, @book2.title,
                        '`title` fields should be populated'
                    assert.isUndefined res.body[1].author,
                        '`author` field should not be populated'
                    done()

        describe '_pagination()', ->

            before ->
                @stack = [
                    middleware.namespace
                    middleware.send()
                    (req, res, next) =>
                        req.vt.query = @Book.find()
                        next()
                    @rest._pagination()
                    @rest._execute()
                    @rest._publish()
                ]

            it 'should be able to paginate results', (done) ->
                @app.get '/pagination/1', @stack

                request(@server)
                    .get('/pagination/1?offset=1&limit=1')
                    .set('Accept', 'application/json')
                    .end (error, res) =>
                        if error? then return done error
                        assert.equal res.statusCode, 200,
                            'should return the correct value'
                        assert.lengthOf res.body, 1,
                            'should return only the second book'
                        assert.equal res.body[0].title, @book2.title,
                            'should return the books title'
                        assert.equal res.body[0].author, @book2.author,
                            'should return the books author'
                        done()

            it 'should default to PAGE_SIZE documents', (done) ->
                ###
                    Checks if default value of pagination
                    offset and limit is respected, ie. it doesn't return
                    the entire collection on a GET.
                ###
                @app.get '/pagination/2', @stack

                insertedBooks = _.map [1..20], (index) =>
                    # Insert a book and returns a promise so we can chain it.
                    book = new @Book
                        title: "book#{index}"
                        author: "author#{index}"
                    Q.ninvoke book, 'save'

                (Q.allSettled insertedBooks).then =>

                    request(@server)
                        .get('/pagination/2')
                        .set('Accept', 'application/json')
                        .end (error, res) =>
                            if error? then return done error
                            assert.equal res.statusCode, 200,
                                'should return the correct value'
                            assert.lengthOf res.body, 10,
                                'should return only the first page of documents'
                            expectedTitles = ("book#{i}" for i in [1..10])
                            actualTitles = _.pluck res.body, 'title'
                            assert.includeMembers expectedTitles, actualTitles,
                                'should fetch only the first inserted books'
                            done()
                , (errors) ->
                    done errors


        describe '_filters()', ->

            it 'should be able to filter results by keys', (done) ->
                stack = [
                    middleware.namespace
                    middleware.send()
                    (req, res, next) =>
                        req.vt.query = @Book.find()
                        next()
                    @rest._filters()
                    @rest._execute()
                    @rest._publish()
                ]

                @app.get '/filters/1', stack

                request(@server)
                    .get('/filters/1?title=book1')
                    .set('Accept', 'application/json')
                    .end (error, res) =>
                        if error? then return done error
                        assert.equal res.statusCode, 200,
                            'should return the correct value'
                        assert.lengthOf res.body, 1,
                            'should return only the first book'
                        assert.equal res.body[0].title, @book1.title,
                            'should return the book with same title as filtered'
                        assert.equal res.body[0].author, @book1.author,
                            'should return the books author'
                        done()

            it 'should support multiple values for the same filter', (done) ->
                stack = [
                    middleware.namespace
                    middleware.send()
                    (req, res, next) =>
                        req.vt.query = @Book.find()
                        next()
                    @rest._filters()
                    @rest._execute()
                    @rest._publish()
                ]

                @app.get '/filters/2', stack

                request(@server)
                    .get('/filters/2?title=book1,book2')
                    .set('Accept', 'application/json')
                    .end (error, res) =>
                        if error? then return done error
                        assert.equal res.statusCode, 200,
                            'should return the correct value'
                        assert.lengthOf res.body, 2,
                            'should return only the first book'
                        titles = _.pluck res.body, 'title'
                        authors = _.pluck res.body, 'author'
                        assert.include titles, @book1.title,
                            'returns the first book'
                        assert.include titles, @book2.title,
                            'returns the second book'
                        assert.include authors, @book1.author,
                            'returns the first author'
                        assert.include authors, @book2.author,
                            'returns the second author'
                        done()

            it 'should support regex filters', (done) ->
                stack = [
                    middleware.namespace
                    middleware.send()
                    (req, res, next) =>
                        req.vt.query = @Book.find()
                        next()
                    @rest._filters()
                    @rest._execute()
                    @rest._publish()
                ]

                @app.get '/filters/3', stack

                request(@server)
                    .get('/filters/3?title=/1/')
                    .set('Accept', 'application/json')
                    .end (error, res) =>
                        if error? then return done error
                        assert.equal res.statusCode, 200,
                            'should return the correct value'
                        assert.lengthOf res.body, 1,
                            'returns only the first book which has one in title'
                        assert.equal res.body[0].title, @book1.title,
                            'should return the correct book'
                        done()


        describe '_sort()', ->

            it 'should sort documents descending by the given param', (done) ->
                stack = [
                    middleware.namespace
                    middleware.send()
                    (req, res, next) =>
                        req.vt.query = @Book.find()
                        next()
                    @rest._sort()
                    @rest._execute()
                    @rest._publish()
                ]

                @app.get '/sort/1', stack

                request(@server)
                    .get('/sort/1?sort=-title')
                    .set('Accept', 'application/json')
                    .end (error, res) =>
                        if error? then return done error
                        assert.equal res.statusCode, 200,
                            'should return the correct value'
                        assert.lengthOf res.body, 2,
                            'should return both book sorted by title'
                        assert.equal res.body[0].title, @book2.title,
                            'first book returned is the second one'
                        assert.equal res.body[1].title, @book1.title,
                            'second book returnd is the first one'
                        done()


    describe 'Generic Endpoints', ->
        ###
            Test book endpoints but with the same
            params as production endpoints.
        ###

        it '.createDoc() should create a new book record', (done) ->
            payload =
                title: 'book3'
                author: 'author1'

            request(@server)
                .post("/apps/#{@shop.ID}/books")
                .set('Authorization', "Basic #{@basicAuth}")
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send(payload)
                .end (errors, res) =>
                    if errors? then return done errors
                    assert.equal res.statusCode, 201,
                        'should succesfully create a new book'
                    assert.equal res.body.title, payload.title,
                        'should return the books title'
                    assert.equal res.body.author, payload.author,
                        'should return the books author'

                    # Check in the database.
                    @Book.findOne()
                        .where('title').equals(payload.title)
                        .where('author').equals(payload.author)
                        .exec (error, newBook) =>
                            if error? then return done error
                            assert.isNotNull newBook,
                                'should have stored the new book'
                            assert.equal newBook.title, payload.title,
                                'should have persisted the new books title'
                            assert.equal newBook.author, @book1.author,
                                'should have persisted the new books author'
                            done()

        it '.readDoc() should return an existing book record', (done) ->
            request(@server)
                .get("/apps/#{@shop.ID}/books/#{@book1.ID}")
                .set('Authorization', "Basic #{@basicAuth}")
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .end (errors, res) =>
                    if errors? then return done errors
                    assert.equal res.statusCode, 200, 'Ok'
                    assert.equal res.body.title, @book1.title, 'same title'
                    assert.equal res.body.author, @book1.author, 'same author'
                    done()


        it '.updateDoc() should update an existing book record', (done) ->
            payload =
                title: 'book3'
            request(@server)
                .put("/apps/#{@shop.ID}/books/#{@book1.ID}")
                .set('Authorization', "Basic #{@basicAuth}")
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send(payload)
                .end (errors, res) =>
                    if errors? then return done errors
                    assert.equal res.statusCode, 200, 'update should work ok'
                    assert.equal res.body.title, payload.title,
                        'should return the new book title'
                    assert.equal res.body.author, @book1.author,
                        'should return the old book author'

                    # Check in the database.
                    @Book.findOne()
                    .where("_id").equals(@book1.ID)
                    .exec (error, updatedBook) =>
                        if error? then return done error
                        assert.equal updatedBook.title, payload.title,
                            'should have persisted the changes'
                        assert.equal updatedBook.author, @book1.author,
                            'book document should have the old author'
                        done()

        it '.updateDoc() should update nested fields of a record', (done) ->
            book = new @Book
                title: 'book'
                author: 'author'
                shop: @shop.ID
                extra:
                    notNested: 1
                    nested:
                        property: true
            book.save (error) =>
                if error? then return done error

                payload =
                    extra:
                        nested:
                            property: false
                request(@server)
                    .put("/apps/#{@shop.ID}/books/#{book.ID}")
                    .set('Authorization', "Basic #{@basicAuth}")
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(payload)
                    .end (errors, res) =>
                        if errors? then return done errors
                        assert.equal res.statusCode, 200, 'update works ok'
                        assert.equal res.body.title, book.title,
                            'title stays the same'
                        assert.equal res.body.author, book.author,
                            'author stays the same'

                        # Check in the database.
                        @Book.findOne()
                        .where('_id').equals(book.ID)
                        .exec (error, updatedBook) ->
                            if error? then return done error
                            assert.isDefined updatedBook,
                                'should still be in the database'
                            expectedExtra =
                                notNested: 1
                                nested:
                                    property: false
                            assert.deepEqual expectedExtra, updatedBook.extra,
                                'should correctly update the extra field'
                            done()

        it '.updateDoc() should override nested arrays', (done) ->
            book = new @Book
                title: 'book'
                author: 'author'
                shop: @shop.ID
                extra:
                    tags: ['romance', 'war']

            book.save (error) =>
                if error? then return done error

                payload =
                    extra:
                        tags: ['adventure']

                request(@server)
                    .put("/apps/#{@shop.ID}/books/#{book.ID}")
                    .set('Authorization', "Basic #{@basicAuth}")
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(payload)
                    .end (errors, res) =>
                        if errors? then return done errors
                        assert.equal res.statusCode, 200, 'update works ok'
                        assert.equal res.body.title, book.title,
                            'title stays the same'
                        assert.equal res.body.author, book.author,
                            'author stays the same'

                        # Check in the database.
                        @Book.findOne()
                        .where('_id').equals(book.ID)
                        .exec (error, updatedBook) =>
                            if error? then return done error
                            assert.isDefined updatedBook,
                                'should still be in the database'
                            expected =
                                extra:
                                    tags: ['adventure']
                            assert.deepEqual expected.extra, updatedBook.extra,
                                'should correctly update a nested array field'
                            done()

        it '.updateDoc() should override with null/undefined', (done) ->
            ###
                Test makes sure that keys updated with null or undefined
                are in fact updated.
            ###
            book = new @Book
                title: 'book'
                author: 'author'
                shop: @shop.ID
                extra: 'extra information'

            book.save (error) =>
                if error? then return done error

                payload =
                    shop: null
                    extra: null

                request(@server)
                    .put("/apps/#{@shop.ID}/books/#{book.ID}")
                    .set('Authorization', "Basic #{@basicAuth}")
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(payload)
                    .end (errors, res) =>
                        if errors? then return done errors
                        assert.equal res.statusCode, 200, 'update works ok'
                        assert.equal res.body.title, book.title,
                            'title stays the same'
                        assert.equal res.body.author, book.author,
                            'author stays the same'

                        # Check in the database.
                        @Book.findOne()
                        .where('_id').equals(book.ID)
                        .exec (error, updatedBook) =>
                            if error? then return done error
                            assert.isDefined updatedBook,
                                'should still be in the database'
                            assert.isNull updatedBook.shop,
                                'should update a reference with null if the '+
                                'reference is not required'
                            assert.isNull updatedBook.extra,
                                'should have updated the extra field with the '+
                                'value instructed as long it is valid'
                            done()


        it '.updateDoc() should correctly handle overwrite params', (done) ->
            ###
                Test asserts that sending `overwrite` params in the query
                string, will actually overwrite the resource value with
                the payload value for the specified keys.
            ###
            book = new @Book
                title: 'book'
                author: 'author'
                shop: @shop.ID
                extra:
                    x: {y: {z: 1}}
                    t: {u: {v: 2}}

            book.save (error) =>
                if error? then return done error

                payload =
                    extra:
                        x: {a: {b: 3}}
                        t: {s: 4}
                request(@server)
                    .put("/apps/#{@shop.ID}/books/#{book.ID}?overwrite=extra.x")
                    .set('Authorization', "Basic #{@basicAuth}")
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(payload)
                    .end (errors, res) =>
                        if errors? then return done errors
                        assert.equal res.statusCode, 200, 'update works ok'
                        assert.equal res.body.title, book.title,
                            'title stays the same'
                        assert.equal res.body.author, book.author,
                            'author stays the same'

                        # Check in the database.
                        @Book.findOne()
                        .where('_id').equals(book.ID)
                        .exec (error, updatedBook) =>
                            if error? then return done error
                            assert.isDefined updatedBook,
                                'should still be in the database'
                            expectedExtra =
                                x: {a: {b: 3}}
                                t: {u: {v: 2}, s: 4}
                            assert.deepEqual expectedExtra, updatedBook.extra,
                                'should correctly update the extra field,'
                                'overwriting x and recursively extending t'
                            done()

        it '.updateDoc() should always overwrite the resource fields', (done) ->
            done()

        it '.updateDoc() should only override the instructed data', (done) ->
            # Regression test for issue #812
            Q().then =>
                @someBook = new @Book
                    title: 'book'
                    author: 'author'
                    shop: @shop.ID
                    extra:
                        tags: [
                            {tag: 'fiction'}
                            {tag: 'novel'}
                            {tag: 'romance'}
                        ]
                        available: true
                Q.ninvoke @someBook, 'save'
            .then =>
                @payload =
                    extra:
                        available: false
                call = request(@server)
                    .put("/apps/#{@shop._id}/books/#{@someBook._id}")
                    .set('Authorization', "Basic #{@basicAuth}")
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(@payload)
                Q.ninvoke call, 'end'
            .then (res) =>
                assert.equal res.statusCode, 200, 'update is ok'

                query = @Book.findById(@someBook.id).lean()
                Q.ninvoke query, 'exec'
            .then (someBook) =>
                assert.isDefined someBook, 'should still be in the db'
                expectedExtra =
                    tags: [
                        {tag: 'fiction'}
                        {tag: 'novel'}
                        {tag: 'romance'}
                    ]
                    available: false
                actualExtra = someBook.extra
                assert.deepEqual actualExtra, expectedExtra,
                    'should not have modified other extras'
            .then (-> done()), done

        it '.removeDoc() should remove an existing book record', (done) ->
            Q().then =>
                removeCall = request(@server)
                    .del("/apps/#{@shop.ID}/books/#{@book1.ID}")
                    .set('Authorization', "Basic #{@basicAuth}")
                    .set('Accept', 'application/json')
                Q.ninvoke removeCall, 'end'
            .then (res) =>
                assert.equal res.statusCode, 204,
                    'delete should have worked'
                assert.deepEqual res.body, {},
                    'delete should return empty payload'

                getCall = request(@server)
                    .get("/apps/#{@shop.ID}/books/#{@book1.ID}")
                    .set('Authorization', "Basic #{@basicAuth}")
                    .set('Accept', 'application/json')
                Q.ninvoke getCall, 'end'
            .then (res) =>
                assert.equal res.statusCode, 404, 'should not find any book'

                # Check in the database.
                query =@Book.findOne()
                    .where('_id').equals(@book1.ID)
                Q.ninvoke query, 'exec'
            .then (book) ->
                assert.isNotNull book, 'should find the book'
                assert.isTrue book.get('deleted'), 'should be marked as removed'
            .then (-> done()), done

        it '.readDocs() should return all existing book records', (done) ->
            request(@server)
                .get("/apps/#{@shop.ID}/books")
                .set('Authorization', "Basic #{@basicAuth}")
                .set('Accept', 'application/json')
                .end (errors, res) =>
                    if errors? then return done errors
                    assert.equal res.statusCode, 200, 'update should work ok'
                    assert.lengthOf res.body, 2, 'should return two objects'
                    assert.deepEqual res.body[0], @book1.publish(),
                        'should return the first book'
                    assert.deepEqual res.body[1], @book2.publish(),
                        'should return the second book'
                    done()

        it '.readDocs() should be able to return books by list of ids', (done) ->
            request(@server)
                .get("/apps/#{@shop.ID}/books?_id=#{@book1.id},#{@book2.id}")
                .set('Authorization', "Basic #{@basicAuth}")
                .set('Accept', 'application/json')
                .end (errors, res) =>
                    if errors? then return done errors
                    assert.equal res.statusCode, 200, 'update should work ok'
                    assert.lengthOf res.body, 2, 'should return two objects'
                    assert.deepEqual res.body[0], @book1.publish(),
                        'should return the first book'
                    assert.deepEqual res.body[1], @book2.publish(),
                        'should return the second book'
                    done()

        it '.countDocs() should return the book count given a filter', (done) ->
            request(@server)
                .get("/apps/#{@shop.ID}/books/counts?title=book1")
                .set('Authorization', "Basic #{@basicAuth}")
                .set('Accept', 'application/json')
                .end (errors, res) =>
                    if errors? then return done errors
                    assert.equal res.statusCode, 200, 'update should work ok'
                    assert.deepEqual res.body, {count: 1},
                        'should count only one book for that filter'
                    done()

        it '.streamDocs() should return a json stream of resources', (done) ->

            request(@server)
                .get("/apps/#{@shop.ID}/books/stream")
                .set('Authorization', "Basic #{@basicAuth}")
                .set('Accept', 'application/json')
                .end (errors, res) =>
                    if errors? then return done errors

                    assert.equal res.statusCode, 200, 'request should be ok'
                    done()

    describe 'Composite Endpoints', ->

        it '.readDocs() should return empty array for a resource '+
           'that does not support the filters', (done) ->

            request(@server)
                .get("/apps/#{@shop.ID}/books?title=book3")
                .set('Authorization', "Basic #{@basicAuth}")
                .set('Accept', 'application/json')
                .end (errors, res) =>
                    if errors? then return done errors

                    assert.equal res.statusCode, 200, 'request should be ok'
                    assert.deepEqual res.body, [], 'should return empty array'
                    done()
