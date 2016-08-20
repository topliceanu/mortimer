const mongoose = require('mongoose');

const conf = require('./conf');
const BookSchema = require('./BookSchema');

mongoose.connect(`mongodb://${conf.mongo.host}:${conf.mongo.port}/${conf.mongo.db}`);

// Public API.
exports.Book = mongoose.model('Book', BookSchema);
