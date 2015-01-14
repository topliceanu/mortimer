_ = require 'underscore'


class Rest

    constructor: (@Model) ->
        ###
            @param {Object} Model - instance of mongoose.Model
        ###
        unless (_.isFunction @Model) and @Model.modelName?
            throw new Error "Rest expected an instance of mongoose.Model"

        # Builds the url key to match the model's id, eg. userId for UserModel.
        @modelName = @Model.modelName.toLowerCase()

        @modelKey = "#{@modelName}Id"

        # Rest functional query params. Eg. offset is used in pagination middleware.
        queryParams: ['fields', 'offset', 'limit', 'sort', 'overwrite']

        # Sets the defaults page size for paginated resources.
        @defaultPageSize = 10

        # Default namespace for data attached by mortimer to the request object.
        @ns = 'mrt'


    # GENERIC ENDPOINTS

    createDoc: (options = {}) ->
        ###
            @param {Object} options - middleware stack options,
                                    can pass down to individual middleware.
            @return {Array} - array of express compatible middleware functions.
        ###
        [
            @create()
            @publish statusCode: 201
        ]

    readDoc: (options = {}) ->
        ###
            @param {Object} options - middleware stack options,
                                    can pass down to individual middleware.
            @return {Array} - array of express compatible middleware functions.
        ###
        [
            @read()
            @fields()
            @execute()
            @publish statusCode: 200
        ]

    patchDoc: (options = {}) ->
        ###
            @param {Object} options - middleware stack options,
                                    can pass down to individual middleware.
            @return {Array} - array of express compatible middleware functions.
        ###
        [
            @read()
            @execute()
            @patch()
            @publish statusCode: 200
        ]

    updateDoc: (options = {}) ->
        ###
            @param {Object} options - middleware stack options,
                                    can pass down to individual middleware.
            @return {Array} - array of express compatible middleware functions.
        ###
        [
            @read()
            @execute()
            @update()
            @publish statusCode: 200
        ]

    removeDoc: (options = {}) ->
        ###
            @param {Object} options - middleware stack options,
                                    can pass down to individual middleware.
            @return {Array} - array of express compatible middleware functions.
        ###
        [
            # Fetch the model.
            @read()
            @execute()
            # Remove the current document.
            @remove()
            @publish statusCode: 204, empty: true
        ]

    createDocs: (options = {}) ->
        ###
            Method creates a batch of instances
            @param {Object} options - middleware stack options,
                                    can be pass down to individual middleware.
            @return {Array} - array of express compatible middleware functions.
        ###

    readDocs: (options = {}) ->
        ###
            Returns a list of documentes, supports filters, pagination,
            sorting, field selection, etc.
            @param {Object} options - middleware stack options,
                                    can pass down to individual middleware.
            @return {Array} - array of express compatible middleware functions.
        ###
        [
            @readAll()
            @pagination()
            @filters()
            @sort()
            @fields()
            @execute()
            @publish statusCode: 200
        ]


    patchDocs: (options = {}) ->
        ###
            Method updates or creates a batch of instances of the current Model.
            One only has to supply the parameters by which the insertion is
            performed.

            @param {Object} options - middleware stack options,
                                    can be pass down to individual middleware.
            @return {Array} - array of express compatible middleware functions.
        ###
        [
            @readAll()
            @pagination()
            @filters()
            @sort()
            @fields()
            @execute()
            @publish statusCode: 200
        ]

    removeDocs: (options = {}) ->
        ###
            @param {Object} options - middleware stack options,
                                    can pass down to individual middleware.
            @return {Array} - array of express compatible middleware functions.
        ###
        [
            @readAll()
            @filters()
            @remove()
            @publish statusCode: 204, empty: true
        ]

    streamDocs: (options = {}) ->
        ###
            This endpoint allows streaming results directly from the database
            and exporting them as a json stream. This works by directly pipe-ing
            the query stream to the http response.
        ###
        [
            @readAll()
            @filters()
            @sort()
            @fields()
            @stream()
        ]


    # MIDDLEWARE

    namespace: (options) ->
        (req, res, next) =>
            ###
                Defines a namespace for data attached by mortimer on the
                http.Request instance.
                @param {Object} req
            ###
            req[@ns] = {}
            next()

    read: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware start the mongoose.Query object for fetching a
                model from the database.
                @param {String} req.params.<modelName>Id - id of model to be returned
                @return {Object} req.mongooseQuery - the mongoose.Query instance
                                            that will fetch the data from Mongo.
            ###
            id = req.params[@modelKey]
            unless id?
                return res.send 404, msg: "Document id not provided"

            req[@ns].query = @Model.findOne()
                .where('_id').equals(id)

            next()

    execute: (options = {}) ->
        (req, res, next) =>
            ###
                Executes the current on-going query. It will set the the
                results in req.vt.result or return an error message if
                something goes wrong.

                @param {Object} req.mongooseQuery - mongoose.Query instance to fetch
                                               data from MongoDB.
                @return {Mixed} req.result - Object or Array depending on the
                                                type of query performed.
            ###
            req[@ns].query.exec (error, documents) =>
                if error?
                    return res.vt.send 500,
                        msg: "Error fetching data"
                unless documents?
                    return res.vt.send 404,
                        msg: 'Unable to find documents to match query'
                req[@ns].result = documents
                next()

    publish: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware prints the results of a previously executed Query.

                @param {Object} req.vt.result - results from mongoose.Query
                                                instance, it's either a Document
                                                or an array of Documents.
                @param {Object} options
                @param {Number} options.statusCode - the status code that will
                                                     be returned to the client.
                @param {Boolean} options.empty - a flag indicating the response
                                                 payload should be empty,
                                                 regardless of req.vt. result

                NOTE! that the result models have to implement `.publish()`.
            ###
            options.statusCode ?= 200
            options.empty ?= false

            output =
                meta: _.clone req.params

            if options.empty isnt true
                output.data = req[@ns].result

            res.send options.statusCode, output


    create: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware creates a document of the current model type
                from the request json payload. It also publishes the
                newly create document.

                @param {Object} req.body - the request payload object
                @return {Object} req.vt.result - newly created instance of model
            ###
            document = new @Model req.body
            document.save (errors) =>
                if errors?
                    return res.vt.send 500, msg: 'Error storing new document'

                req[@ns].result = document
                return next()

    patch: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware updates one record in the database by it's id.
                If a record isn't found an error is thrown.

                This middleware also supports the `overwrite` functional query
                parameter which is a list of keys whose values in the request
                payload should overwrite the resource corresponding values,
                instead of getting merged with them.

                NOTE! by default keys with array values are overwritten.

                @param {String} req.query.overwrite - list of keys to be
                                            overwritten by values in payload.
                @param {Object} req.body - the request payload to be added over
                                           the existing model record.
                @param {Mixed} req.vt.result - instance of the Model
                                               to be updated.
                @return {Mixed} req.vt.result - instance of the Model that was
                                                just updated.
            ###

            for path, newValue of req.body
                req[@ns].result.set path, newValue

            req[@ns].result.save (error) ->
                if error?
                    return res.send 500, msg: "Error patching document"

                next()

    update: (options = {}) ->
        (req, res, next) =>
            ###
                Completely replaces the resource.
            ###
            delete req.body._id
            req[@ns].result.set '.', req.body
            req[@ns].save (error) ->
                if error?
                    return res.send 500, msg: "Error updating document"

                next()

    remove: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware removes the specified document from the db if it
                belongs to the current shop.

                @param {String} req.params.modelId - id of model to be updated
                @param {Object} req.vt.result - instance of current Model to
                                                be removed
            ###
            req[@ns].result.remove (error) ->
                if error?
                    Rest.log 'error', "Unable to remove document", error
                    return res.vt.send 500, 'error removing document'

                return next()

    readAll: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware creates a mongoose.Query instance that fetches all
                models from the database.

                @return {Object} req.vt.query - instance of mongoose.Query to
                                                fetch models from database.
            ###
            req.vt.query = @Model.find()
            next()

    stream: (options = {}) ->
        (req, res, next) ->
            ###
                Method streams query results directly to the http response.

                @param {Object} req.vt.query - instance of mongoose.Query to
                                                fetch models from database.
            ###
            res.writeHeader 200, 'Content-Type': 'application/json'

            stream = req.vt.query.lean().stream transform: JSON.stringify
            stream.pipe res


    # QUERY MODIFIERS

    fields: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware modifies the current query object to only fetch
                specified fields
                @param {String} req.query.fields - a query parameter with a
                                    coma separated list of attributes to
                                    fetch for the current query.
                @return {Object} req.vt.query - the mongoose.Query instance that
                                                will fetch the data from Mongo.
            ###
            unless req.query.fields? then return next()

            fields = (req.query.fields.split ',').join ' '
            req.vt.query.select fields
            next()

    pagination: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware applies pagination parameter to the current query.
                @param {String} [req.query.offset] - where to start the result
                                                     set, it defaults to 0
                @param {String} [req.query.limit] - how many records to return,
                                                    defaults to @defaultPageSize
                @param {Object} req.vt.query - instance of mongoose.Query to
                                               fetch models from database.
                @return {Object} req.vt.query - modifies the instance of
                                                mongoose.Query to paginate the
                                                results.
            ###
            offset = if req.query.offset? then req.query.offset else 0
            limit = if req.query.limit? then req.query.limit else @defaultPageSize

            req.vt.query.skip offset
            req.vt.query.limit limit
            next()

    filters: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware filters the results of the current query, with
                the params from the request url query string.
                It will ignore the `fields` param used to specify which fields
                to fetch. It will also ignore all other functional parameters.

                Formats supported by this middleware:
                1. string separated by forward slashed denoting
                a regex expression, `Q.regex` will be used.
                2. coma separated string values, `Q.in()` will be used
                3. plain string value, `Query.equals()` will be used

                @param {Object} req.query - dict with url query string params.
                @param {Object} req.vt.query - instance of mongoose.Query to
                                               fetch models from database.
                @return {Object} req.vt.query - modifies the instance of
                                                mongoose.Query to filter the
                                                results.
            ###
            reservedKeys = @queryParams
            for key, value of req.query when not (key in reservedKeys)

                isRegexp = /^\/.*?\/$/.test value
                if isRegexp
                    regExp = new RegExp value[1...-1], 'gim'
                    req.vt.query.where(key).regex(regExp)
                    continue

                values = value.split ','
                if values.length > 1
                    req.vt.query.where(key).in(values)
                    continue

                req.vt.query.where(key).equals(value)
            next()

    sort: (options = {}) ->
        (req, res, next) =>
            ###
                Middleware sorts the result set by the given `sort` field.
                The `sort` value is a field name of the current model by
                which the sort will be performed.
                In addition the field name can be prefixed with `-` to
                indicate sorting in descending order.

                @param {Object} req.query - dict with url query string params.
                @param {Object} req.query.sort - the field/order to sort by.
                @param {Object} req.vt.query - instance of mongoose.Query to
                                               fetch models from database.
            ###
            if _.isString req.query.sort
                req.vt.query.sort req.query.sort
            next()

    # UTILITIES

    @log: (args...) ->
        console.log args...


# Public API.
module.exports = Rest
