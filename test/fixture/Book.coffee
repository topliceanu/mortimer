mongoose = require 'mongoose'


{Mixed} = mongoose.Schema.Types

BookSchema = new mongoose.Schema
    title: {type: String, required: true}
    author: {type: String, required: true}
    details: {type: Mixed}

Book = mongoose.model 'Book', BookSchema


# Public API.
module.exports = Book
