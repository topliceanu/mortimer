/*
 * This examples shows how to extend functionality of the basic endpoints.
 *
 * Mortimer is built on the belief that you should be aware of the
 * implementation of the libraries you use, so that you can extend their
 * functionality to better suit your needs. In this it is similar to Backbone.js.
 *
 * In this example we want to add basic validation to the input json payload.
 * We achive this by extending the `createDoc()` method which returns a list
 * of middleware functions to include our sanityCheck() middleware just before
 * storing the data in mongodb.
 *
 * We then simply reuse all the other middleware provided by mortimer.
 * Mortimer is compatible with connect/express middleware so you can mix and
 * match your middleware, with connect, with other third parties and with
 * middleware created by you. You are also encouraged to override mortimer
 * middleware as needed.
 *
 * To run, simply:
 *  $ node ./quick-bootstrap.js
 *
 * To test:
 * $ curl -XPOST http://localhost:3000/books -H 'Content-type: application/json' -d '{"title": "Suuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuper long title", "author": "Some Author"}'
 * $ {"msg":"Bad payload format"}
 */

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const mortimer = require('../lib/'); // require('mortimer');


// Handle connection to mongodb and data modeling.
mongoose.connect('mongodb://localhost:27017/examples');

const BookSchema = new mongoose.Schema({
    'title': {type: String},
    'author': {type: String}
});
const Book = mongoose.model('Book', BookSchema);


// Setup http server with express.
const app = express();
app.set('query parser', 'simple');
app.use(bodyParser.json());


// Extend mortimer.Resource class so that before creating a new book,
// the request json payload is validated.
class BookResource extends mortimer.Resource {
    constructor () {
        super(Book);
    }

    createDoc () {
        return [
            this.namespace(),
            this.sanityCheck(), // this middleware is added to the original stack.
            this.create(),
            this.publish({statusCode: 201})
        ];
    }

    /*
     * Returns a middleware function to check if the payload is correct:
     * author and title fields must be String smaller than 100 characters.
     * It will return 400 Bad Payload otherwise.
     */
    sanityCheck () {
        return function (req, res, next) {
            if (req.body.title &&
                req.body.title.length < 100 &&
                req.body.author &&
                req.body.author.length < 100) {
                // 'Valid payload'
                next();
            }
            else {
                res.status(400).send({msg: 'Bad payload format'});
            }
        };
    }
}


const resource = new BookResource();
app.post('/books', resource.createDoc());


// Start the http server on http://localhost:3000/
app.listen(3000, 'localhost');
