# Changelog

## Version 2.1.0 - Oct 20, 2016
* Add optional log function parameter to the constructor. This allows clients to dirrect errors to their own logging infrastructure

## Version 2.0.1 - Aug 28, 2016
* Fix critical bug, the implementation code base was not bundled in the npm package because of the way .npmignore works with .gitignore in node v6.

## Version 2.0.0 - Aug 20, 2016
* Port the codese to ES2015. Compatiblity with node version <6 was dropped, please use v1.1.0 for this.

## Version 1.1.0 - Jan 19, 2015
* Implement `PUT /<resource>/:<resource>Id` to completely replace document.
* Implement `PATCH /<resource>` to update a set of selected documents.
* Implement `DELETE /<resource>` to remove a set of selected documents.
* Improve documentation accross the board.
* Update examples and README.md to showcase the new endpoints.

## Version 1.0.1 - Jan 17, 2015
* Patch error capturing and reporting by the api.
* Improve methods documentation

## Version 1.0.0 - Jan 13, 2015
* Bump major version! This version is no longer compatible with previous ones!
* Huge rethink of the module to improve extendability.
* Port the code to coffeescript for better maintanability.
* Update to latest versions of mongoose and express.
* Add code documentations.
* Add code coverage.
* Add examples.

## Version 0.1.9 - Dec 8, 2012
* A log time ago!
