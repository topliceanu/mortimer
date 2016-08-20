'use strict';

const mongoose = require('mongoose');

const Mixed = mongoose.Schema.Types.Mixed;

const BookSchema = new mongoose.Schema({
    title: {type: String, required: true},
    author: {type: String, required: true},
    details: {type: Mixed}
});

// Public API.
module.exports = BookSchema;
