mongoose = require 'mongoose'


{Mixed} = mongoose.Schema.Types

BookSchema = new mongoose.Schema
    title: {type: String, required: true}
    author: {type: String, required: true}
    details: {type: Mixed}

# Public API.
module.exports = BookSchema
