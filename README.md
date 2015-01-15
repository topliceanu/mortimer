mortimer = MOngoose ResT
========================

Gist
====

**Mortimer** is an extendible REST interface for mongoose models, designed for the entire project lifecycle: from fast prototyping to custom functionality.

Raport
======

[![NPM](https://nodei.co/npm/mortimer.png?downloads=true&stars=true)](https://nodei.co/npm/mortimer/)

[![NPM](https://nodei.co/npm/mortimer.png?months=6)](https://nodei.co/npm-dl/mortimer/)


| Indicator     |               |
|:-------------|:-------------|
| documentation | [coffedoc.info][http://coffeedoc.info/github/topliceanu/mortimer/master/]|
| continuous integration | [![Build Status](https://travis-ci.org/topliceanu/mortimer.svg?branch=master)](https://travis-ci.org/topliceanu/mortimer) |
| dependency management | [![Dependency Status](https://david-dm.org/alanshaw/david.svg?style=flat)](https://david-dm.org/alanshaw/david) [![devDependency Status](https://david-dm.org/alanshaw/david/dev-status.svg?style=flat)](https://david-dm.org/alanshaw/david#info=devDependencies) |
| code coverage | [![Coverage Status](https://coveralls.io/repos/topliceanu/mortimer/badge.svg)](https://coveralls.io/r/topliceanu/mortimer) |dd


Features
========


Example
=======

Contributing
============

1. Before starting to work on an ideea, please open an issue. You will get an answer ASAP.
2. Clone the repo `$ git clone git@github.com:topliceanu/mortimer.git`
3. If you use [vagrant](https://www.vagrantup.com/) then simply clone the repo into a folder then issue `$ vagrant up`
4. If you don't use it, then:
 - install mongodb and have it running on `localhost:27017`.
 - install node.js and all node packages required in development using `$ npm install`
 - See `./vagrant_boostrap.sh` for instructions on how to setup all dependencies on a fresh ubuntu machine.
5. Run the tests to make sure you have a correct setup: `$ mocha`
6. Submit a pull request with your code
 - make sure code is linted (tests too). Use coffeelint for that too.
 - make sure you add tests to your idea
 - make sure existing tests still pass
 - make sure test coverage does not decrease
 - run coffeelint on the source code
 - make sure you document your code and generated code looks ok.
7. Have my kindest thanks for making this project better.


Licence
=======

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
