_ = require 'underscore'


# Base class for all Resources.
#
# @example How to quickly generate rest endpoint for your mongoose model.
#   // ...
#   var bookResource = new Resource(BookModel);
#   // ...
#   app.get('/books', bookResource.readDocs())
#   app.post('/books', bookResource.createDoc())
#   app.get('/books/:bookId', bookResource.readDoc())
#   app.patch('/books/:bookId', bookResource.patchDoc())
#   app.delete('/books/:bookId', bookResource.removeDoc())
#   // ...
#
class Resource

    # Builds a new Resource instance given a mongoose.Model class.
    #
    # @param Model {Object} instance of mongoose.Model
    # @param {Object} options
    # @option options {String} modelName useful for composing the modelKey
    # @option options {String} modelKey useful for identifying model id in routes
    # @option options {Number} defaultPageSize pagination default page size
    # @option options {String} namespace placeholder for custom data and methods.
    #
    constructor: (Model, options = {}) ->
        unless (_.isFunction Model) and Model.modelName?
            throw new Error "Resource expected an instance of mongoose.Model"

        # @property {Object} Model instance of mongoose.Model
        @Model = Model

        # @property {String} modelName override the name of the model
        @modelName = options.modelName or @Model.modelName.toLowerCase()

        # @property {String} modelKey override :modelId key in routes.
        @modelKey = options.modelKey or "#{@modelName}Id"

        # @property {Array<String>} reservedQueryParams ignored by filters.
        @reservedQueryParams = ['_fields', '_skip', '_limit', '_sort']

        # @property {Number} defaultPageSize default page size when paginating.
        @defaultPageSize = options.defaultPageSize or 10

        # @property {String} ns custom mortimer data attached to http.Request.
        @ns = options.namespace or 'mrt'

    # GENERIC ENDPOINTS

    # Middleware stack which creates a new document.
    #
    # @example Bind this middleware to an express endpoint.
    #   var bookResource = new Resource(BookModel);
    #   // ...
    #   app.post('/books', bookResource.createDoc());
    #
    # @param {Object} options pass options to middleware stack
    # @return {Array<Function>} list of express compatible middleware functions.
    #
    createDoc: (options = {}) ->
        [
            @namespace()
            @create()
            @publish statusCode: 201
        ]

    # Middleware stack which reads a document by it's id.
    #
    # @example Bind this middleware to an express endpoint.
    #   var bookResource = new Resource(BookModel);
    #   // ...
    #   app.get('/books/:bookId', bookResource.readDoc());
    #
    # @param {Object} options pass options to middleware stack
    # @return {Array<Function>} list of express compatible middleware functions.
    #
    readDoc: (options = {}) ->
        [
            @namespace()
            @read()
            @fields()
            @execute()
            @publish statusCode: 200
        ]

    # Middleware stack which updates a document by the provided id.
    #
    # @example Bind this middleware to an express endpoint.
    #   var bookResource = new Resource(BookModel);
    #   // ...
    #   app.patch('/books/:bookId', bookResource.patchDoc());
    #
    # @param {Object} options pass options to middleware stack
    # @return {Array<Function>} list of express compatible middleware functions.
    #
    patchDoc: (options = {}) ->
        [
            @namespace()
            @read()
            @execute()
            @patch()
            @publish statusCode: 200
        ]

    # Middleware stack which removes a document specified by id.
    #
    # @example Bind this middleware to an express endpoint.
    #   var bookResource = new Resource(BookModel);
    #   // ...
    #   app.delete('/books/:bookId', bookResource.removeDoc());
    #
    # @param {Object} options pass options to middleware stack
    # @return {Array<Function>} list of express compatible middleware functions.
    #
    removeDoc: (options = {}) ->
        [
            @namespace()
            @read()
            @execute()
            @remove()
            @publish statusCode: 204, empty: true
        ]

    # Middleware stack which returns a list of documents from the database.
    # It supports advanced filtering, pagination, sorting, field selection, etc.
    #
    # @example Bind this middleware to an express endpoint.
    #   var bookResource = new Resource(BookModel);
    #   // ...
    #   app.get('/books', bookResource.readDocs());
    #
    # @param {Object} options pass options to middleware stack
    # @return {Array<Function>} list of express compatible middleware functions.
    #
    readDocs: (options = {}) ->
        [
            @namespace()
            @readAll()
            @pagination()
            @filters()
            @sort()
            @fields()
            @execute()
            @publish statusCode: 200
        ]

    # Middleware stack which returns the number of documents in a collection.
    # It supports counting after filtering the collection.
    #
    # This endpoint is separate from readDocs because of performance issues,
    # mongo does not return a count of all documents when using skip, limit.
    #
    # @example Bind this middleware to an express endpoint.
    #   var bookResource = new Resource(BookModel);
    #   // ...
    #   app.get('/books/count', bookResource.countDoc());
    #
    # @param {Object} options pass options to middleware stack
    # @return {Array<Function>} list of express compatible middleware functions.
    #
    countDocs: (options = {}) ->
        ###
            Counts the documents from the current collection which match the
            optional filters
        ###
        [
            @namespace()
            @readAll()
            @filters()
            @count()
            @publish statusCode: 200
        ]


    # MIDDLEWARE

    # Returns a middleware which sets a namespace object on the http.Request
    # instance built by express. It is used to attach data and custom functions.
    #
    # @param {Object} options pass options to middleware stack
    # @return {Function} express compatible middleware function.
    #
    namespace: (options) ->
        (req, res, next) =>
            req[@ns] = {}
            next()

    # Middleware start the mongoose.Query object for fetching a
    # model from the database.
    #
    # @param {String} req.params.<modelName>Id id of model to be returned
    # @param {mongoose.Query} req.<ns>.query the mongoose.Query instance
    #                                    that will fetch the data from Mongo.
    # @return {Function} middleware function
    #
    read: (options = {}) ->
        (req, res, next) =>
            id = req.params[@modelKey]
            unless id?
                return res.status(404).send msg: "Document id not provided"

            req[@ns].query = @Model.findOne()
                .where('_id').equals(id)

            next()

    # Middleware creates a document of the current model type
    # from the request json payload. It also publishes the
    # newly created document.
    #
    # @param {Object} req.body the request payload object to be wrapped.
    # @param {mongose.Model} req.<ns>.result newly created instance of model.
    # @return {Function} middleware function
    #
    create: (options = {}) ->
        (req, res, next) =>
            document = new @Model req.body
            document.save (errors) =>
                if errors?
                    return res.status(500).send
                        msg: 'Error storing new document'

                req[@ns].result = document
                return next()


    # Middleware updates one record in the database by it's id.
    # If a record isn't found an error is thrown.
    #
    # @param req.body {Object} the request payload to be added over the
    #                          existing model record.
    # @param req.<ns>.result {mongoose.Model} instance of the Mode to be updated.
    # @param req.<ns>.result {Mixed} instance of the Model that was just updated.
    # @return {Function} middleware function
    #
    patch: (options = {}) ->
        (req, res, next) =>
            for path, newValue of req.body
                req[@ns].result.set path, newValue

            req[@ns].result.save (error) ->
                if error?
                    return res.status(500).send msg: "Error patching document"

                next()

    # Middleware removes the specified document from the db if it
    # belongs to the current shop.
    #
    # @param req.params.modelId {String} id of model to be updated
    # @param req.<ns>.result {Object} instance of current Model that was removed
    # @return {Function} middleware function
    #
    remove: (options = {}) ->
        (req, res, next) =>
            req[@ns].result.remove (error) ->
                if error?
                    return res.status(500).send msg: 'error removing document'

                return next()

    # Middleware creates a mongoose.Query instance that fetches all
    # models from the database.
    #
    # @param req.<ns>.query {mongoose.Query} instance of mongoose.Query to
    #                                         fetch models from database.
    # @return {Function} middleware function
    #
    readAll: (options = {}) ->
        (req, res, next) =>
            req[@ns].query = @Model.find()
            next()

    # Middleware counts the number of items currently selected.
    #
    # @param req.<ns>.result {Number} the result of the count query.
    # @return {Function} middleware function
    #
    count: (options = {}) ->
        (req, res, next) =>
            req[@ns].query.count (error, count) =>
                if error?
                    return res.status(500).send msg: 'Error counting documents'

                req[@ns].result = count
                next()

    # Executes the current built query. It will set the the
    # results in req.<ns>.result or return an error message if
    # something goes wrong.
    #
    # @param {mongoose.Query} req.<ns>.query query for mongodb.
    # @param {Number|Object|Array<Object>} req.<ns>.result query result.
    # @return {Function} middleware function
    #
    execute: (options = {}) ->
        (req, res, next) =>
            req[@ns].query.exec (error, documents) =>
                if error?
                    return res.status(500).send
                        msg: error.message
                unless documents?
                    return res.status(404).send
                        msg: 'Resources not found'
                req[@ns].result = documents
                next()

    # Middleware prints the results of a previously executed Query.
    #
    # @param req.<ns>.result {Object} results from mongoose.Query
    #                                 instance, it's either a Document
    #                                 or an array of Documents.
    # @param {Object} options
    # @param options {Number} statusCode status code  returned to the client.
    # @param options {Boolean} empty - if the response payload should be empty.
    # @return {Function} middleware function
    #
    publish: (options = {}) ->
        (req, res, next) =>
            options.statusCode ?= 200
            res.status options.statusCode

            options.empty ?= false
            if options.empty is true
                return res.send()

            output =
                meta: _.clone req.query
                data: @format req[@ns].result
            res.send output

    # QUERY MODIFIERS

    # Middleware modifies the current query object to only fetch
    # specified fields
    #
    # @example Have the endpoint return only a subset of the data in docs.
    #   request.get('/books?_fields=author,title')
    #
    # @param req.query._fields {String} list of coma separated field keys
    # @param req.<ns>.query {mongoose.Query} fetches the data from Mongo.
    # @return {Function} middleware function
    #
    fields: (options = {}) ->
        (req, res, next) =>
            unless req.query._fields? then return next()

            fields = (req.query._fields.split ',').join ' '
            req[@ns].query.select fields
            next()

    # Middleware applies pagination parameter to the current query.
    #
    # @example Have the endpoint return a slice of the collection
    #   request.get('/books?_skip=100&_limit=200')
    #
    # @param req.query._skip {Number} where to start fetching the result set.
    # @param req.query._limit {String} how many records to return
    # @param req.<ns>.query {mongoose.Query} fetch models from database.
    # @param req.<ns>.query {mongoose.Query} modifies query to paginate results.
    # @return {Function} middleware function
    #
    pagination: (options = {}) ->
        (req, res, next) =>
            skip = if req.query._skip? then req.query._skip else 0
            limit = if req.query._limit? then req.query._limit \
                    else @defaultPageSize

            req[@ns].query.skip skip
            req[@ns].query.limit limit
            next()

    # Middleware filters the results of the current query, with
    # the params from the request url query string.
    #
    # It will ignore the reserved query params attached to the class.
    #
    # This middleware supports multiple operators matching those in mongo:
    #  eq, ne, lt, lte, gt, gte, regex, etc.
    #
    # @example How to find all books named Hamlet
    #   request.get('/books?title__eq=Hamlet')
    #
    # @example How to find all books with more than 1000 pages
    #   request.get('/books?numPages__gte=1000')
    #
    # @example How to find all books written in russian, between 1800 and 1900
    #   request.get('/books?lang=ru&writtenIn__gte=1800&writtenIn__lte=1900')
    #
    # @param req.query {Object} query string params acting as filters
    # @param req.<ns>.query {mongoose.Query} fetches models from database.
    # @param req.<ns>.query {mongoose.Query} modifies query to filter results
    # @return {Function} middleware function
    #
    filters: (options = {}) ->
        (req, res, next) =>
            for key, value of req.query when not (key in @reservedQueryParams)
                if key[-4..] is '__eq'
                    where = key[..-5]
                    operator = 'equals'
                    param = value
                else if key[-4..] is '__ne'
                    where = key[..-5]
                    operator = 'ne'
                    param = value
                else if key[-4..] is '__gt'
                    where = key[..-5]
                    operator = 'gt'
                    param = +value
                else if key[-5..] is '__gte'
                    where = key[..-6]
                    operator = 'gte'
                    param = +value
                else if key[-4..] is '__lt'
                    where = key[..-5]
                    operator = 'lt'
                    param = +value
                else if key[-5..] is '__lte'
                    where = key[..-6]
                    operator = 'lte'
                    param = +value
                else if key[-4..] is '__in'
                    where = key[..-5]
                    operator = 'in'
                    param = value.split ','
                else if key[-7..] is '__regex'
                    where = key[..-8]
                    operator = 'regex'
                    param = ///#{value}///gim
                else
                    where = key
                    operator = 'equals'
                    param = value

                req[@ns].query.where(where)[operator](param)

            next()

    # Middleware sorts the result set by the given _sort field.
    #
    # The _sort value is a field name of the current model by
    # which the sort will be performed.
    #
    # In addition the field name can be prefixed with `-` to
    # indicate sorting in descending order.
    #
    # @example Retrieve all books sorted by title descending.
    #   request.get('/books?_sort=-title')
    #
    # @param req.query {Object} dict with url query string params.
    # @param req.query._sort {Object} the field/order to sort by.
    # @param req.<ns>.query {Object} instance of mongoose.Query to
    #                                fetch models from database.
    # @return {Function} middleware function
    #
    sort: (options = {}) ->
        (req, res, next) =>
            if _.isString req.query._sort
                req[@ns].query.sort req.query._sort
            next()

    # HELPERS

    # Utility to log events to from the module.
    # Override this method to hook up your own loggin infrastructure.
    #
    # @param {String} level the logging level, one of debug, info, warn, error.
    # @param {String} message log message
    # @param {Array<Object>} context optional list of relevant objects
    #
    log: (level, message, context...) ->
        console.log level, message, context...

    # Format the results from database. By default, mongoose serializes the
    # documents, but you should override this method for custom formatting.
    #
    # @param {Object} results depend on the resolved query.
    #
    # @return {Function} middleware function
    #
    format: (results) ->
        results


# Public API.
module.exports = Resource
