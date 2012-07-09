// Resource.js - abstraction handling model data

var mongoose =  require('mongoose');
var util = require('./util.js');


var Resource = function (Model) {
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


// params = {action, id, body, pagination, fields, filters}
fn.methodFactory = function (params) {
	switch (params.action.toLowerCase()) {
		case 'get': 
			if (params.id) return 'read';
			else return 'readAll';
		case 'post': 
			return 'create';
		case 'put':
			if (params.id) return 'update';
			else return 'updateAll';
		case 'delete':
			if (params.id) return 'destroy';
			else return 'destroyAll';
	}
};


// params = {action, id, body, pagination, fields, filters}
fn.execute = function (params, callback) {
	var method = this.methodFactory(params);
	return this[method](params, callback);
};


fn.print = function (document) {
	var out = document.toObject();
	var prop;
	for (prop in out) {
		out[prop] = out[prop].toString();
	}
	out.id = out._id;
	delete out._id;
	return out;
};


fn.read = function (params, callback) {
	var query = this.Model.findById(params.id);
	var print = this.print;
	if (params.fields) {
		query.select(params.fields.join(' '));
	} 
	return query.exec( function (err, document) {
		if (err) return callback( new Resource.Error(500, err) );		
		if (!document) return callback( new Resource.Error(404, this.name+' #'+params.id+' not found') );

		return callback(null, print(document));
	});
};


fn.create = function (params, callback) {
	var document = new this.Model(params.body);
	var print = this.print;
	return document.save( function (err) {
		if (err) return callback( new Resource.Error(500, err) );
		return callback(null, print(document));
	});
};


fn.update = function (params, callback) {
	var print = this.print, prop;
	return this.Model.findById( params.id, function (err, document) {
		if (err) return callback( new Resource.Error(500, err) );
		if (!document) return callback( new Resource.Error(404, this.name+' #'+params.id+' not found') );

		for (prop in params.body) {
			document[prop] = params.body[prop];
		};

		document.save( function (err) {
			if (err) return callback( new Resource.Error(500, err) );
			return callback(null, print(document));
		});
	});
};


fn.destroy = function (params, callback) {
	return this.Model.findById( params.id, function (err, document) {
		if (err) return callback( new Resource.Error(500, err) );
		if (!document) return callback( new Resource.Error(404, this.name+' #'+params.id+' not found') );
		
		document.remove( function (err) {
			if (err) return callback( new Resource.Error(500, err) );
			return callback(null);
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
		return callback(null, output);
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
	if (params.body) changes = params.body

	return this.Model.update( conditions, changes, options, function (err) {
		if (err) return callback( new Resource.Error(500, err) );

		return that.readAll(params, callback);
	});
};


fn.destroyAll = function (params, callback) {
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
		return callback(null);
	});
};


// custom http error
Resource.Error = function (code, message) {
	this.code = code;
	this.name = "ResourceError";
	this.message = message;
};

Resource.Error.prototype = new Error();
Resource.Error.prototype.constructor = Resource.Error;

// public api
module.exports = Resource;

