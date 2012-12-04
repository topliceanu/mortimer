var mongoose = require('mongoose');

var ObjectId = mongoose.Schema.ObjectId;

var Book;
var BookSchema = new mongoose.Schema({
	'title': {'type': String, 'required': true},
	'author': {'type': ObjectId, 'ref': 'Author'}
});

BookSchema.methods.toJSON = function () {
    var out = {
        title: this.title
    };
    if (this.author) out.author = this.author.toString();
    return out
};

Book = mongoose.model('Book', BookSchema);
module.exports = Book;
