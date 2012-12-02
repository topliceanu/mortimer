var mongoose = require('mongoose');

var ObjectId = mongoose.Schema.ObjectId;

var Author;
var AuthorSchema = new mongoose.Schema({
	'name': {'type': String, 'required': true},
	'books': [{'type': ObjectId, 'ref': 'Book'}]
});

AuthorSchema.methods.toJSON = function () {
    var out = {
        name: this.name,
        books: []
    };
    this.books.forEach( function (book) {
        out.books.push(book.toString());
    });
    return out;
};


Author = mongoose.model('Author', AuthorSchema);
module.exports = Author;
