// util.js - utility functions

var util = require('util');

exports.extend = function () {};

// pluralization rules
var rules = [
  [/(m)an$/gi, '$1en'],
  [/(pe)rson$/gi, '$1ople'],
  [/(child)$/gi, '$1ren'],
  [/^(ox)$/gi, '$1en'],
  [/(ax|test)is$/gi, '$1es'],
  [/(octop|vir)us$/gi, '$1i'],
  [/(alias|status)$/gi, '$1es'],
  [/(bu)s$/gi, '$1ses'],
  [/(buffal|tomat|potat)o$/gi, '$1oes'],
  [/([ti])um$/gi, '$1a'],
  [/sis$/gi, 'ses'],
  [/(?:([^f])fe|([lr])f)$/gi, '$1$2ves'],
  [/(hive)$/gi, '$1s'],
  [/([^aeiouy]|qu)y$/gi, '$1ies'],
  [/(x|ch|ss|sh)$/gi, '$1es'],
  [/(matr|vert|ind)ix|ex$/gi, '$1ices'],
  [/([m|l])ouse$/gi, '$1ice'],
  [/(quiz)$/gi, '$1zes'],
  [/s$/gi, 's'],
  [/$/gi, 's']
];

// uncountable words
var uncountables = [
  'advice',
  'energy',
  'excretion',
  'digestion',
  'cooperation',
  'health',
  'justice',
  'labour',
  'machinery',
  'equipment',
  'information',
  'pollution',
  'sewage',
  'paper',
  'money',
  'species',
  'series',
  'rain',
  'rice',
  'fish',
  'sheep',
  'moose',
  'deer',
  'news'
];

var pluralize = function (str) {
  var rule, found;
  if (!~uncountables.indexOf(str.toLowerCase())){
    found = rules.filter(function(rule){
      return str.match(rule[0]);
    });
    if (found[0]) return str.replace(found[0][0], found[0][1]);
  }
  return str;
};


var extend = function () {
	var result = {},
			args = Array.prototype.slice.call(arguments),
			mergeRecursive = function (obj1, obj2) {
				for (var p in obj2) {
					try {
						if ( obj2[p].constructor==Object ) {
							obj1[p] = mergeRecursive(obj1[p], obj2[p]);
						}
						else {
							obj1[p] = obj2[p];
						}
					}
					catch(e) {
						obj1[p] = obj2[p];
					}
				}
				return obj1;
			};

	args.forEach( function (obj) {
		mergeRecursive(result, obj);
	});
	return result;
};

var titleize = function (text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
};


// public api
exports.isArray = util.isArray;
exports.pluralize = pluralize;
exports.extend = extend;
exports.titleize = titleize;
