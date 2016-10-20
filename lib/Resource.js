/**
 * Base class for all Resources.
 *
 * @example How to quickly generate rest endpoint for your mongoose model.
 *   // ...
 *   var bookResource = new Resource(BookModel);
 *   // ...
 *   app.get('/books', bookResource.readDocs())
 *   app.post('/books', bookResource.createDoc())
 *   app.delete('/books', bookResource.removeDocs())
 *   app.get('/books/:bookId', bookResource.readDoc())
 *   app.patch('/books/:bookId', bookResource.patchDoc())
 *   app.put('/books/:bookId', bookResource.putDoc())
 *   app.delete('/books/:bookId', bookResource.removeDoc())
 *   // ...
 */
class Resource {

    /*
     * Builds a new Resource instance given a mongoose.Model class.
     *
     * @param Model {Object} instance of mongoose.Model
     * @param {Object} options
     * @option options {String} modelName useful for composing the modelKey
     * @option options {String} modelKey useful for identifying model id in routes
     * @option options {Number} defaultPageSize pagination default page size
     * @option options {String} namespace placeholder for custom data and methods.
     * @option options {Function} log is a function(level, message, args...) {}
    */
    constructor (Model, options = {}) {
        if (!this.isMongooseModel(Model)) {
            throw new Error('Resource expected an instance of mongoose.Model');
        }

        // @property {Object} Model instance of mongoose.Model
        this.Model = Model;

        // @property {String} modelName override the name of the model
        this.modelName = options.modelName || this.Model.modelName.toLowerCase();

        // @property {String} modelKey override :modelId key in routes.
        this.modelKey = options.modelKey || `${this.modelName}Id`;

        // @property {Array<String>} reservedQueryParams ignored by filters.
        this.reservedQueryParams = ['_fields', '_skip', '_limit', '_sort'];

        // @property {Array<String>} supportedQueryOperators query operators.
        this.supportedQueryOperators = ['eq', 'ne', 'lt', 'gt', 'lte',
                                        'gte', 'regex', 'in'];

        // @property {Number} defaultPageSize default page size when paginating.
        this.defaultPageSize = options.defaultPageSize || 10;

        // @property {String} ns custom mortimer data attached to http.Request.
        this.ns = options.namespace || 'mrt';

        // @property {Function} a function to log messages. Defaults to noop.
        if (this.is('Function', options.log)) {
            this.log = options.log;
        }
        else {
            this.log = () => {}; // noop.
        }
    }

    // GENERIC ENDPOINTS

    /**
     * Middleware stack which creates a new document.
     *
     * @example Bind this middleware to an express endpoint.
     *   var bookResource = new Resource(BookModel);
     *   // ...
     *   app.post('/books', bookResource.createDoc());
     *
     * @return {Array<Function>} list of express compatible middleware functions.
     */
    createDoc () {
        return [
            this.namespace(),
            this.create(),
            this.publish({statusCode: 201})
        ];
    }

    /**
     * Middleware stack which reads a document by it's id.
     *
     * @example Bind this middleware to an express endpoint.
     *   var bookResource = new Resource(BookModel);
     *   // ...
     *   app.get('/books/:bookId', bookResource.readDoc());
     *
     * @return {Array<Function>} list of express compatible middleware functions.
     */
    readDoc () {
        return [
            this.namespace(),
            this.read(),
            this.fields(),
            this.execute(),
            this.publish({statusCode: 200})
        ];
    }

    /**
     * Middleware stack which updates a document by the provided id.
     *
     * @example Bind this middleware to an express endpoint.
     *   var bookResource = new Resource(BookModel);
     *   // ...
     *   app.patch('/books/:bookId', bookResource.patchDoc());
     *
     * @return {Array<Function>} list of express compatible middleware functions.
     */
    patchDoc () {
        return [
            this.namespace(),
            this.read(),
            this.execute(),
            this.patch(),
            this.publish({statusCode: 200})
        ];
    }

    /**
     * Middleware stack which replaces existing resource with the provided
     * request body.
     *
     * @example Bind this middleware to an express endpoint.
     *   var bookResource = new Resource(BookModel);
     *   // ...
     *   app.put('/books/:bookId', bookResource.putDoc());
     */
    putDoc () {
        return [
            this.namespace(),
            this.read(),
            this.execute(),
            this.put(),
            this.publish({statusCode: 200})
        ];
    }

    /**
     * Middleware stack which removes a document specified by id.
     *
     * @example Bind this middleware to an express endpoint.
     *   var bookResource = new Resource(BookModel);
     *   // ...
     *   app.delete('/books/:bookId', bookResource.removeDoc());
     *
     * @return {Array<Function>} list of express compatible middleware functions.
     */
    removeDoc () {
        return [
            this.namespace(),
            this.read(),
            this.execute(),
            this.remove(),
            this.publish({statusCode: 204, empty: true})
        ];
    }

    /**
     * Middleware stack which returns a list of documents from the database.
     * It supports advanced filtering, pagination, sorting, field selection, etc.
     *
     * @example Bind this middleware to an express endpoint.
     *   var bookResource = new Resource(BookModel);
     *   // ...
     *   app.get('/books', bookResource.readDocs());
     *
     * @return {Array<Function>} list of express compatible middleware functions.
     */
    readDocs () {
        return [
            this.namespace(),
            this.readAll(),
            this.pagination(),
            this.filters(),
            this.sort(),
            this.fields(),
            this.execute(),
            this.publish({statusCode: 200})
        ];
    }

    /**
     * Middleware stack which patches all documents selected by the query params.
     * This endpoint does not return the modified documents.
     * For that you will need to perform another request.
     *
     * @example Bind this middleware to an express endpoint.
     *   var bookResource = new Resource(BookModel);
     *   // ...
     *   app.patch('/books', bookResource.patchDocs());
     *
     * @return {Array<Function>} list of express compatible middleware functions.
     */
    patchDocs () {
        return [
            this.namespace(),
            this.readAll(),
            this.pagination(),
            this.filters(),
            this.sort(),
            this.patchAll(),
            this.publish({statusCode: 200})
        ];
    }

    /**
     * Middleware stack which removes all documents matched by the query filters.
     *
     * @example Bind this middleware to an express endpoint.
     *   var bookResource = new Resource(BookModel);
     *   // ...
     *   app.delete('/books', bookResource.removeDocs());
     *
     * @return {Array<Function>} list of express compatible middleware functions.
     */
    removeDocs () {
        return [
            this.namespace(),
            this.readAll(),
            this.pagination(),
            this.filters(),
            this.sort(),
            this.removeAll(),
            this.publish({statusCode: 200, empty: true})
        ];
    }

    /**
     * Middleware stack which returns the number of documents in a collection.
     * Supports filters.
     *
     * This endpoint is separate from readDocs because of performance issues,
     * mongo does not return a count of all documents when using skip, limit.
     *
     * @example Bind this middleware to an express endpoint.
     *   var bookResource = new Resource(BookModel);
     *   // ...
     *   app.get('/books/count', bookResource.countDocs());
     *
     * @return {Array<Function>} list of express compatible middleware functions.
     */
    countDocs () {
        return [
            this.namespace(),
            this.readAll(),
            this.filters(),
            this.countAll(),
            this.publish({statusCode: 200})
        ];
    }


    // MIDDLEWARE

    /**
     * Returns a middleware which sets a namespace object on the http.Request
     * instance built by express. It is used to attach data and custom functions.
     *
     * @return {Function} express compatible middleware function.
     */
    namespace () {
        return (req, res, next) => {
            req[this.ns] = {};
            return next();
        };
    }

    /**
     * Middleware start the mongoose.Query object for fetching a
     * model from the database.
     *
     * @param {String} req.params.<modelName>Id id of model to be returned
     * @param {mongoose.Query} req.<ns>.query the mongoose.Query instance
     *                                    that will fetch the data from Mongo.
     * @return {Function} middleware function
     */
    read () {
        return (req, res, next) => {
            const id = req.params[this.modelKey];
            if (!id) {
                return res.status(404).send({
                    msg: 'Document id not provided'
                });
            }

            req[this.ns].query = this.Model.findOne()
                .where('_id').equals(id);

            return next();
        };
    }

    /**
     * Middleware creates a document of the current model type
     * from the request json payload. It also publishes the
     * newly created document.
     *
     * Note that this middleware creates the new document from the received
     * body without performing validation, this is left to the implemention.
     *
     * @param {Object} req.body the request payload object to be wrapped.
     * @param {mongose.Model} req.<ns>.result newly created instance of model.
     * @return {Function} middleware function
     */
    create () {
        return (req, res, next) => {
            const document = new this.Model(req.body);
            document.save((error) => {
                if (error) {
                    this.log('error', 'Failed to store document', error);
                    return res.status(500).send({
                        msg: 'Error storing new document'
                    });
                }

                req[this.ns].result = document;
                return next();
            });
        };
    }

    /**
     * Middleware updates one record in the database by it's id.
     * If a record isn't found an error is thrown.
     *
     * @param {Object} req.body the request payload to be added over the
     *                          existing model record.
     * @param {mongoose.Model} req.<ns>.result instance of the Mode to be updated.
     * @param {Mixed} req.<ns>.result instance of the Model that was just updated.
     * @return {Function} middleware function
     */
    patch () {
        return (req, res, next) => {
            Object.keys(req.body).forEach((path) => {
                const newValue = req.body[path];
                req[this.ns].result.set(path, newValue);
            });

            req[this.ns].result.save((error) => {
                if (error) {
                    this.log('error', 'Failed to patch document', error);
                    return res.status(500).send({
                        msg: 'Error patching document'
                    });
                }
                return next();
            });
        };
    }

    /**
     * Middleware replaces a document with the provided body.
     *
     * Because no better way is available in mongoose, this middleware will
     * remove the existing document then insert it again with the new data.
     * Please note that this endpoint is not thread safe!
     *
     * @param {Object} req.<ns>.result instance of current Model to be replaced.
     * @return {Function} middleware function
     */
    put () {
        return (req, res, next) => {
            req[this.ns].result.remove((error) => {
                if (error) {
                    this.log('error', 'Failed to read document for update', error);
                    return res.status(500).send({
                        msg: 'Failed to replace the document'
                    });
                }

                const document =  new this.Model(req.body);
                document._id = req[this.ns].result._id;
                document.save((error) => {
                    if (error) {
                        this.log('error', 'Failed to update document', error);
                        return res.status(500).send({
                            msg: 'Error replacing document'
                        });
                    }

                    req[this.ns].result = document;
                    return next();
                });
            });
        };
    }

    /**
     * Middleware removes the specified document from the db if it
     * belongs to the current shop.
     *
     * @param {String} req.params.modelId id of model to be updated
     * @param {Object} req.<ns>.result instance of current Model that was removed
     * @return {Function} middleware function
     */
    remove () {
        return (req, res, next) => {
            req[this.ns].result.remove((error) => {
                if (error) {
                    this.log('error', 'Failed to remove document', error);
                    return res.status(500).send({
                        msg: 'error removing document'
                    });
                }
                return next();
            });
        };
    }
    /**
     * Middleware creates a mongoose.Query instance that fetches all
     * models from the database.
     *
     * @param {mongoose.Query} req.<ns>.query instance of mongoose.Query to
     *                                         fetch models from database.
     * @return {Function} middleware function
     */
    readAll () {
        return (req, res, next) => {
            req[this.ns].query = this.Model.find();
            return next();
        };
    }

    /**
     * Middleware adds an update clause to query being constructed then executes
     * it. This way it updates all documents selected by the query.
     *
     * @param {Object} req.body payload to overwrite data on selected documents.
     * @param {mongoose.Query} req.<ns>.query instance of mongoose.Query to
     *                                        fetch models from database.
     * @return {Function} middleware function
     */
    patchAll () {
        return (req, res, next) => {
            req[this.ns].query.setOptions({multi: true});
            req[this.ns].query.update(req.body, (error) => {
                if (error) {
                    this.log('error', 'Failed to update collection', error);
                    return res.status(500).send({
                        msg: 'Unable to patch selected documents'
                    });
                }
                return next();
            });
        };
    }

    /**
     * Middleware to remove all documents selected previously.
     *
     * @param {Number|Object|Array<Object>} req.<ns>.result query result.
     * @return {Function} middleware function
     */
    removeAll () {
        return (req, res, next) => {
            req[this.ns].query.remove((error) => {
                if (error) {
                    this.log('error', 'Failed to remove collection', error);
                    return res.status(500).send({
                        msg: 'Failed to remove selected documents'
                    });
                }
                return next();
            });
        };
    }

    updateAll () {
      // TODO this middleware should update all documents that support this.
    }

    /**
     * Middleware counts the number of items currently selected.
     *
     * @param {Number} req.<ns>.result the result of the count query.
     * @return {Function} middleware function
     */
    countAll () {
        return (req, res, next) => {
            req[this.ns].query.count((error, count) => {
                if (error) {
                    this.log('error', 'Failed to count documents', error);
                    return res.status(500).send({
                        msg: 'Error counting documents'
                    });
                }
                req[this.ns].result = count;
                return next();
            });
        };
    }

    /**
     * Executes the current built query. It will set the the
     * results in req.<ns>.result or return an error message if
     * something goes wrong.
     *
     * @param {mongoose.Query} req.<ns>.query query for mongodb.
     * @param {Number|Object|Array<Object>} req.<ns>.result query result.
     * @return {Function} middleware function
     */
    execute () {
        return (req, res, next) => {
            req[this.ns].query.exec((error, documents) => {
                if (error) {
                    this.log('error', 'Failed to execute mongoose query', error);
                    return res.status(500).send({
                        msg: error.message
                    });
                }
                if (!documents) {
                    return res.status(404).send({
                        msg: 'Resources not found'
                    });
                }
                req[this.ns].result = documents;
                return next();
            });
        };
    }

    /**
     * Middleware prints the results of a previously executed Query.
     *
     * @param req.<ns>.result {Object} results from mongoose.Query
     *                                 instance, it's either a Document
     *                                 or an array of Documents.
     * @param {Object} options
     * @param options {Number} statusCode status code  returned to the client.
     * @param options {Boolean} empty - if the response payload should be empty.
     * @return {Function} middleware function
     */
    publish (options = {}) {
        return (req, res) => {
            options.statusCode = options.statusCode || 200;
            res.status(options.statusCode);

            options.empty = options.empty || false;
            if (options.empty === true) {
                return res.status(options.statusCode).send();
            }

            return res.status(options.statusCode).json({
                meta: Object.assign({}, req.query),
                data: this.format(req[this.ns].result)
            });
        };
    }

    // QUERY MODIFIERS

    /**
     * Middleware modifies the current query object to only fetch
     * specified fields
     *
     * @example Have the endpoint return only a subset of the data in docs.
     *   request.get('/books?_fields=author,title')
     *
     * @param {String} req.query._fields list of coma separated field keys
     * @param {mongoose.Query} req.<ns>.query fetches the data from Mongo.
     * @return {Function} middleware function
     */
    fields () {
        return (req, res, next) => {
            if (!req.query._fields) {
                return next();
            }

            const fields = req.query._fields.split(',').join(' ');
            req[this.ns].query.select(fields);
            return next();
        };
    }

    /**
     * Middleware applies pagination parameter to the current query.
     *
     * @example Have the endpoint return a slice of the collection
     *   request.get('/books?_skip=100&_limit=200')
     *
     * @param {Number} req.query._skip where to start fetching the result set.
     * @param {Number} req.query._limit how many records to return
     * @param {mongoose.Query} req.<ns>.query fetch models from database.
     * @return {Function} middleware function
     */
    pagination () {
        return (req, res, next) => {
            const skip = req.query._skip ? +req.query._skip : 0;
            const limit = req.query._limit ? +req.query._limit : this.defaultPageSize;
            req[this.ns].query.skip(skip);
            req[this.ns].query.limit(limit);
            return next();
        };
    }

    /**
     * Middleware filters the results of the current query, with
     * the params from the request url query string.
     *
     * It will ignore the reserved query params attached to the class.
     *
     * This middleware supports multiple operators matching those in mongo:
     *  eq, ne, lt, lte, gt, gte, regex, etc.
     *
     * @example How to find all books named Hamlet
     *   request.get('/books?title__eq=Hamlet')
     *
     * @example How to find all books with more than 1000 pages
     *   request.get('/books?numPages__gte=1000')
     *
     * @example How to find all books written in russian, between 1800 and 1900
     *   request.get('/books?lang=ru&writtenIn__gte=1800&writtenIn__lte=1900')
     *
     * @param {Object} req.query query string params acting as filters
     * @param {mongoose.Query} req.<ns>.query fetches models from database.
     * @return {Function} middleware function
     */
    filters () {
        return (req, res, next) => {
            Object.keys(req.query).forEach((key) => {
                if (this.reservedQueryParams.indexOf(key) !== -1) {
                    return;
                }

                const parts = key.split('__');
                const operand = parts[0];
                let operator = parts[1] || 'eq';
                let value = req.query[key];

                if (this.supportedQueryOperators.indexOf(operator) === -1) {
                    return;
                }

                switch (operator) {
                case 'gt':
                    value = +value; // cast to int.
                    break;
                case 'gte':
                    value = +value; // cast to int
                    break;
                case 'lt':
                    value = +value; // cast to int
                    break;
                case 'lte':
                    value = +value; // cast to int
                    break;
                case 'in':
                    value = value.split(','); // transform into array.
                    break;
                case 'regex':
                    value = new RegExp(value, 'gim');
                    break;
                }
                req[this.ns].query.where(operand)[operator](value);
            });

            return next();
        };
    }

    /**
     * Middleware sorts the result set by the given _sort field.
     *
     * The _sort value is a field name of the current model by
     * which the sort will be performed.
     *
     * In addition the field name can be prefixed with `-` to
     * indicate sorting in descending order.
     *
     * @example Retrieve all books sorted by title descending.
     *   request.get('/books?_sort=-title')
     *
     * @param {Object} req.query dict with url query string params.
     * @param {String} req.query._sort the field/order to sort by.
     *                                 Eg `&_sort=-createdOn`
     * @param {Object} req.<ns>.query instance of mongoose.Query to
     *                                fetch models from database.
     * @return {Function} middleware function
     */
    sort () {
        return (req, res, next) => {
            if (this.is('String', req.query._sort)) {
                req[this.ns].query.sort(req.query._sort);
            }
            return next();
        };
    }

    /**
     * Format the database results. By default, mongoose serializes the
     * documents, but you should override this method for custom formatting.
     *
     * @param {Object} results depend on the resolved query.
     *
     * @return {Function} middleware function
     */
    format (results) {
        return results;
    }

    /**
     * Helper function to check if a value is of a given type.
     * @param {String} type - one of Array, Function, String, Number, Boolean...
     * @param {Object} value - any javascript value.
     *
     * @return {Boolean}
     */
    is (type, value) {
        return Object.prototype.toString.call(value) === `[object ${type}]`;
    }

    /**
     * Determins whether the passed in constructor function is a mongoose.Model.
     * @param {Function} model
     *
     * @return {Boolean}
     */
    isMongooseModel (model ) {
        return this.is('Function', model) &&
            this.is('String', model.modelName) &&
            this.is('Function', model.findOne) &&
            this.is('Function', model.find);
    }
}

// Public API.
module.exports = Resource;
