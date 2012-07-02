var mongoose = require('mongoose');

var ObjectId = mongoose.Schema.ObjectId;

var Book;
var BookSchema = new mongoose.Schema({
	'title': {'type': String, 'required': true},
	'author': {'type': ObjectId, 'ref': 'Author'}
});

Book = mongoose.model('Book', BookSchema);
module.exports = Book;
