var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/mortimer');

var Author = require('./Author.js');
var Book = require('./Book.js');


exports.before = function (done) {
    var that = this;
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

    Author.collection.remove( function (err) {
        if (err) return done(err);
        Book.collection.remove( function (err) {
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
                            author.save( function (err) {
                                if (err) return done(err);
                                that.book1 = book1;
                                that.book2 = book2;
                                that.book3 = book3;
                                that.author = author;
                                return done();
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.after = function (done) {
    var that = this;
    return exports.Author.collection.remove( function (err) {
        if (err) return done(err);
        return exports.Book.collection.remove(function (err) {
            if (err) return done(err);
            delete that.author;
            delete that.book1;
            delete that.book2;
            delete that.book3;
            return done();
        });
    });
};

exports.Book = Book;
exports.Author = Author;
