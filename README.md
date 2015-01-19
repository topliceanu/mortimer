# mortimer = MOngoose ResT

## Gist

**Mortimer** is an extendible REST interface for mongoose models, designed for the entire project lifecycle: from fast prototyping to advanced custom functionality.

## Status

[![NPM](https://nodei.co/npm/mortimer.png?downloads=true&stars=true)](https://nodei.co/npm/mortimer/)

[![NPM](https://nodei.co/npm-dl/mortimer.png?months=12)](https://nodei.co/npm-dl/mortimer/)

| Indicator              |                                                                          |
|:-----------------------|:-------------------------------------------------------------------------|
| documentation          | [topliceanu.github.io/mortimer](http://topliceanu.github.io/mortimer) ~~[hosted on coffedoc.info](http://coffeedoc.info/github/topliceanu/mortimer/master/)~~|
| continuous integration | [![Build Status](https://travis-ci.org/topliceanu/mortimer.svg?branch=master)](https://travis-ci.org/topliceanu/mortimer) |
| dependency management  | [![Dependency Status](https://david-dm.org/topliceanu/mortimer.svg?style=flat)](https://david-dm.org/topliceanu/mortimer) [![devDependency Status](https://david-dm.org/topliceanu/mortimer/dev-status.svg?style=flat)](https://david-dm.org/topliceanu/mortimer#info=devDependencies) |
| code coverage          | [![Coverage Status](https://coveralls.io/repos/topliceanu/mortimer/badge.svg?branch=master)](https://coveralls.io/r/topliceanu/mortimer?branch=master) |
| examples               | [/examples](https://github.com/topliceanu/mortimer/tree/master/examples) |
| development management | [![Stories in Ready](https://badge.waffle.io/topliceanu/mortimer.svg?label=ready&title=Ready)](http://waffle.io/topliceanu/mortimer) |
| change log             | [CHANGELOG](https://github.com/topliceanu/mortimer/blob/master/CHANGELOG.md) [Releases](https://github.com/topliceanu/mortimer/releases) |

## Features

- Focus on extensibility. Fully plugable!
- Does not depend on mongoose or express packages. It just builds arrays of middleware functions.
- Easy to bootstrap a basic REST API for your models.
- Supports filtering, pagination, sorting, property selection.

## Install

```shell
npm install mortimer
```

## Quick Example

```javascript
var bodyParser = require('body-parser');
var express = require('express');
var mongoose = require('mongoose');
var mortimer = require('mortimer');


// Handle connection to mongodb and data modeling.
mongoose.connect('mongodb://localhost:27017/examples');

var BookSchema = new mongoose.Schema({
    'title': {type: String},
    'author': {type: String}
});

var Book = mongoose.model('Book', BookSchema);


// Setup http server with express.
var app = express();
app.set('query parser', 'simple');
app.use(bodyParser.json());


// Setup mortimer endpoints.
var resource = new mortimer.Resource(Book);
app.post('/books', resource.createDoc());
app.get('/books', resource.readDocs());
app.get('/books/count', resource.countDocs());
app.patch('/books', resource.patchDocs());
app.delete('/books', resource.removeDocs());
app.get('/books/:bookId', resource.readDoc());
app.patch('/books/:bookId', resource.patchDoc());
app.put('/books/:bookId', resource.putDoc());
app.delete('/books/:bookId', resource.removeDoc());


// Start the http server on http://localhost:3000/
app.listen(3000, 'localhost');
```

## More Examples

See more in the `/examples` directory. All examples have instructions on __how to run and test them__.

- if you want to quickly bootstrap a rest api, check out [this example](https://github.com/topliceanu/mortimer/blob/master/examples/quick-bootstrap.js). You can rapidly define your own routes and let mortimer handle the requests.
- if you want to add middleware in front of every endpoint, check out [this example](https://github.com/topliceanu/mortimer/blob/master/examples/add-auth-to-create-endpoint.js). This can be usefull to add authentication, rate limiting, payload validation, output sanitation, etc. Mortimer is a backbone for all that.
- if you want to add custom functionality to just one middleware, check out [this example](https://github.com/topliceanu/mortimer/blob/master/examples/extend-existing-middleware-functionality.js)

## Contributing

1. Contributions to this project are more than welcomed!
    - Anything from improving docs, code cleanup to advanced functionality is greatly appreciated.
    - Before you start working on an ideea, please open an issue and describe in detail what you want to do and __why it's important__.
    - You will get an answer in max 12h depending on your timezone.
2. Fork the repo!
3. If you use [vagrant](https://www.vagrantup.com/) then simply clone the repo into a folder then issue `$ vagrant up`
    - if you don't use it, please consider learning it, it's easy to install and to get started with.
    - If you don't use it, then you have to:
         - install mongodb and have it running on `localhost:27017`.
         - install node.js and all node packages required in development using `$ npm install`
         - For reference, see `./vagrant_boostrap.sh` for instructions on how to setup all dependencies on a fresh ubuntu 14.04 machine.
    - Run the tests to make sure you have a correct setup: `$ npm run test`
4. Create a new branch and implement your feature.
 - make sure you add tests for your feature. In the end __all tests have to pass__! To run test suite `$ npm run test`.
 - make sure test coverage does not decrease. Run `$ npm run coverage` to open a browser window with the coverage report.
 - make sure you document your code and generated code looks ok. Run `$ npm run doc` to re-generate the documentation.
 - make sure code is linted (and tests too). Run `$ npm run lint`
 - submit a pull request with your code.
 - hit me up for a code review!
5. Have my kindest thanks for making this project better!


## Licence

(The MIT License)

Copyright (c) 2012 Alexandru Topliceanu (alexandru.topliceanu@gmail.com)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
