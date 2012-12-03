var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/mortimer');

exports.Author = require('./Author.js');
exports.Book = require('./Book.js');


var author = new exports.Author({
	'name': 'Lev Tolstoi',
	'nationality': 'russian'
});
var book1 = new exports.Book({
	'title': 'War and Peace',
	'author': author
});
var book2 = new exports.Book({
	'title': 'Anna Karenina',
	'author': author
});
var book3 = new exports.Book({
	'title': 'Redemption',
	'author': author
});

exports.book1 = book1;
exports.book2 = book2;
exports.book3 = book3;
exports.author = author;

exports.before = function (done) {
    exports.Author.collection.remove( function (err) {
        if (err) return done(err);
        exports.Book.collection.remove( function (err) {
            if (err) return done(err);
            author.save( function (err) {
                if (err) return done(err);
                book1.save( function (err) {
                    if (err) return done(err);
                    book2.save( function (err) {
                        if (err) return done(err);
                        book3.save( function (err) {
                            if (err) return done(err);
                            author.books = [book1, book2, book3];
                            author.save(done);
                        });
                    });
                });
            });
        });
    });
};

exports.after = function (done) {
    return exports.Author.collection.remove( function (err) {
        if (err) return done(err);
        return exports.Book.collection.remove(done);
    });
};
