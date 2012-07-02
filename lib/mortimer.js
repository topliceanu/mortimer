var mongoose = require('mongoose');
var util = require('./util.js');

// with/without id, with/without association, with/withou association id
var getApiUrl = function (opts) {
	opts = opts || {};
	opts.base = opts.base || '/api/v1';

	if (!opts.model)
		throw new Error('model param expected');
	if (!opts.model instanceof mongoose.Model)
		throw new Error('model param should be instance of mongoose.Model');
	if (opts.associate && !opts.associate instanceof mongoose.Model) 
		throw new Error('associate param should be instance of mongoose.Model');
	if (opts.withAssociateId && !opts.associate)
		throw new Error('associate param expected');

	var url = opts.base;
	if (opts.model) {
		url += '/'+util.pluralize(opts.model.modelName.toLowerCase());
	}
	if (opts.withId) {
		url += '/:'+opts.model.modelName.toLowerCase()+'Id';
	}
	if (opts.associate) {
		url += '/'+util.pluralize(opts.associate.modelName.toLowerCase());
	}
	if (opts.withAssociateId) {
		url += '/:'+opts.associate.modelName.toLowerCase()+'Id';
	}
	return url;
};

var getAssociates = function (Model) {
};

var rest = function (app, Model, opts) {
	var modelUrl = getApiUrl({model: Model});
	var modelUrlWithId = getApiUrl({model: Model, withId: true});

	app.get(modelUrl, Model.readAll());
	app.post(modelUrl, Model.create());
	app.put(modelUrl, Model.updateAll());
	app.del(modelUrl, Model.deleteAll());

	app.get(modelUrlWithId, Model.read());
	app.post(modelUrlWithId, printError);
	app.put(modelUrlWithId, Model.update());
	app.del(modelUrlWithId, Model.remove());

	for (Associate in getAssociates(Model)) {
		var modelUrlWithAssociate = getApiUrl({model: Model, withId: true, associate: Associate});
		var modelUrlWithAssociateAndId = getApiUrl({model: Model, withId: true, associate: Associate, withAssociateId: true});

		app.get(modelUrlWithAssociate, Model.readAll(Associate));
		app.post(modelUrlWithAssociate, Model.create(Associate));
		app.put(modelUrlWithAssociate, Model.updateAll(Associate));
		app.del(modelUrlWithAssociate, Model.removeAll(Associate));

		app.get(modelUrlWithAssociateAndId, Associate.read());
		app.post(modelUrlWithAssociateAndId, printError);
		app.put(modelUrlWithAssociateAndId, Associate.update());
		app.del(modelUrlWithAssociateAndId, Model.removeAssociation(Associate));
	}
};


// public api
exports.getApiUrl = getApiUrl;
exports.getAssociates = getAssociates;
exports.rest = rest;
