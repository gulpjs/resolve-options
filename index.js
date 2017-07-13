'use strict';

var koalas = require('koalas');
var normalize = require('value-or-function');

var slice = Array.prototype.slice;

function createResolver(config, options) {
  // TODO: should the config object be validated?
  config = config || {};
  options = options || {};

  var resolver = {
    resolve: resolve,
  };

  // Keep requested keys to detect (and disallow) recursive resolution
  var stack = [];

  function resolve(key) {
    var appliedArgs = slice.call(arguments, 1);

    var definition = config[key];
    // Ignore options that are not defined
    if (!definition) {
      return;
    }

    if (stack.some(function(s) {
      return s === key;
    })) {
      throw new Error('Recursive resolution denied.');
    }

    stack.push(key);
    try {
      var option = options[key];
      // Bind the option so it can resolve other options if necessary
      if (typeof option === 'function') {
        option = option.bind(resolver);
      }

      var args = [definition.type, option].concat(appliedArgs);
      var result = normalize.apply(null, args);

      var fallback = definition.default;
      // Bind & apply the default so it can resolve other options if necessary
      if (typeof fallback === 'function') {
        fallback = fallback.apply(resolver, appliedArgs);
      }

      stack.pop();
      return koalas(result, fallback);

    } catch (err) {
      stack.pop();
      throw err;
    }
  }

  return resolver;
}

module.exports = createResolver;
