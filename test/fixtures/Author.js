var mongoose = require('mongoose');

var ObjectId = mongoose.Schema.ObjectId;

var Author;
var AuthorSchema = new mongoose.Schema({
	'name': {'type': String, 'required': true},
	'books': [{'type': ObjectId, 'ref': 'Book'}]
});

Author = mongoose.model('Author', AuthorSchema);
module.exports = Author;
