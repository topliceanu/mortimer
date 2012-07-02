var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/mortimer');

exports.Author = require('./Author.js');
exports.Book = require('./Book.js');
