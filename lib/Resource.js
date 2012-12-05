var mongoose =  require('mongoose');
var _ = require('underscore');

var util = require('./util.js');

var ObjectId = mongoose.Types.ObjectId;


var Resource = function (Model) {
    /**
     * Resource is an abstraction for handling model data in endpoints.
     */

	if (!Model || !Model instanceof mongoose.Model)
		throw new Error('bad param');

	this.Model = Model;
	this.schema = Model.schema;
	this.collection = Model.collection;

	this.name = this.Model.modelName.toLowerCase();
	this.collection = util.pluralize(this.name);
	this.key = this.name+'Id';
};


// prototype alias
var fn = Resource.prototype;


fn.path = function (withResourceId) {
	var path = '/'+this.collection;
	if (withResourceId) path += '/:'+this.key;
	return path;
};


fn.methodFactory = function (params) {
    /*
     * @param {String} [params.action]
     * @param {String} [params.id]
     * @param {String} [params.body] Only for POST/PUT requests
     * @param {String} [params.pagination] Optional
     * @param {String} [params.fields] Optional
     * @param {String} [params.filters] Optional
     */
	switch (params.action.toLowerCase()) {
		case 'get':
			if (params.id) return 'read';
			else return 'readAll';
			break;
		case 'post':
			return 'create';
		case 'put':
			if (params.id) return 'update';
			else return 'updateAll';
			break;
		case 'delete':
			if (params.id) return 'del';
			else return 'delAll';
	}
};


fn.execute = function (params, callback) {
    /*
     * @param {String} [params.action]
     * @param {String} [params.id]
     * @param {String} [params.body] Only for POST/PUT requests
     * @param {String} [params.pagination] Optional
     * @param {String} [params.fields] Optional
     * @param {String} [params.filters] Optional
     * @param {Function} callback
     */
	var method = this.methodFactory(params);
	return this[method](params, callback);
};

var _printer = function (input) {
    var output;
    if (input instanceof ObjectId) {
        output = input.toString();
    }
    else if (_.isNumber(input)) {
        output = (input).valueOf();
        return output;
    }
    else if (_.isArray(input)) {
        output = [];
        for (var i = 0, n = input.length; i < n; i ++) {
           output.push(_printer(input[i]));
        }
    }
    else if (_.isObject(input)) {
        output = {};
        for (var key in input) {
            var value = input[key];
            output[key] = _printer(value);
        }
    }
    else {
        output = input.toString();
    }
    return output;
};

fn.print = function (document) {
    /**
     * @param {Object} document - mongoose.Model instance
     * @returns {Object} - plain object representations of the document.
     */
    // Recursively parse the output object>
	var out = document.toObject();
    out = _printer(out);

    // Cleanup.
	out.id = out._id;
	delete out._id;
    delete out.__v;

	return out;
};


fn.read = function (params, callback) {
	var query = this.Model.findById(params.id);
	var print = this.print;

    // Select only certain fields.
	if (params.fields) {
		query.select(params.fields.join(' '));
	}

	return query.exec( function (err, document) {
		if (err) return callback( new Resource.Error(500, err) );
		if (!document) return callback( new Resource.Error(404, this.name+' #'+params.id+' not found') );

        var response = new Resource.Data(200, print(document));
		return callback(null, response);
	});
};


fn.create = function (params, callback) {
    // TODO Check input params.body for required model properties. Should output 403 Forbidden or 201 No Content.

	var document = new this.Model(params.body);
	var print = this.print;
	return document.save( function (err) {
		if (err) return callback( new Resource.Error(500, err) );

        var response = new Resource.Data(201, print(document));
		return callback(null, response);
	});
};


fn.update = function (params, callback) {
    // TODO Check input params.body for required model properties.
    // Try UPDATE instead.

	var print = this.print;
    var modelName = this.name;
	return this.Model.findById( params.id, function (err, document) {
		if (err) return callback( new Resource.Error(500, err) );
		if (!document) return callback( new Resource.Error(404, modelName+' #'+params.id+' not found') );

		for (var prop in params.body) {
			document[prop] = params.body[prop];
		}

		document.save( function (err) {
			if (err) {
                return callback( new Resource.Error(500, err) );
            }

            var response = new Resource.Data(200, print(document));
			return callback(null, response);
		});
	});
};


fn.del = function (params, callback) {
	return this.Model.findById( params.id, function (err, document) {
		if (err) return callback( new Resource.Error(500, err) );
		if (!document) return callback( new Resource.Error(404, this.name+' #'+params.id+' not found') );

		document.remove( function (err) {
			if (err) return callback( new Resource.Error(500, err) );

            var response = new Resource.Data(204);
			return callback(null, response);
		});
	});
};


fn.readAll = function (params, callback) {
	var query = this.Model.find();
	var print = this.print;

	if (!params.pagination) {
		params.pagination = {};
		params.pagination.limit = 10;
		params.pagination.offset = 0;
	}

	query.skip(params.pagination.offset)
				.limit(params.pagination.limit);

	if (params.fields) {
		query.select(params.fields.join(' '));
	}

	if (params.filters) {
		for (var filter in params.filters) {
			query.where(filter).equals(params.filters[filter]);
		}
	}

	return query.exec( function (err, documents) {
		if (err) return callback( new Resource.Error(500, err) );
		if (!documents || !Array.isArray(documents) || documents.length === 0)
			return callback( new Resource.Error(404, 'Documents Not Found') );

		var output = documents.map( function (document) {
			return print(document);
		});
        var response = new Resource.Data(200, output);
		return callback(null, response);
	});
};


fn.updateAll = function (params, callback) {
	var that = this;
	var conditions = {},
        changes = {},
        options = {
            upsert: false,
            multi: true
        };

	if (params.filters) conditions = params.filters;
	if (params.body) changes = params.body;

	return this.Model.update( conditions, changes, options, function (err) {
		if (err) return callback( new Resource.Error(500, err) );

		return that.readAll(params, callback);
	});
};


fn.delAll = function (params, callback) {
	var query = this.Model.find();
	var errors = [];

	if (params.filters) {
		for (var filter in params.filters) {
			query.where(filter).equals(params.filters[filter]);
		}
	}

	var stream = query.stream();
	stream.on('data', function (document) {
		stream.pause();
		document.remove(function (err) {
			if (err) errors.push(err);
			stream.resume();
		});
	});
	stream.on('error', function (err) {
		errors.push(err);
	});
	stream.on('close', function () {
		if (errors.length > 0) return callback( new Response.Error(500, errors) );

        var response = new Resource.Data(204);
		return callback(null, response);
	});
};


Resource.Data = function (code, message) {
    // Custom Resource Output.
    // Shares code and message interface with Resource.Error.
    this.code = code;
    this.message = message;
};


Resource.Error = function (code, message) {
    // Custom http error.
	this.code = code;
	this.name = "ResourceError";
	this.message = message;
};

Resource.Error.prototype = new Error();
Resource.Error.prototype.constructor = Resource.Error;

// public api
module.exports = Resource;
