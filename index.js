'use strict';

var normalize = require('value-or-function');

var slice = Array.prototype.slice;

function createResolver(config, options) {
  // TODO: should the config object be validated?
  config = config || {};
  options = options || {};

  var resolver = {
    resolve: resolve,
  };

  // Keep constants separately
  var constants = {};

  // Keep requested keys to detect (and disallow) recursive resolution
  var stack = [];

  function resolve(key) {

    if (constants.hasOwnProperty(key)) {
      return constants[key];
    }

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
      var appliedArgs = slice.call(arguments, 1);
      var args = [definition.type, option].concat(appliedArgs);

      if (typeof option === 'function') {
        option = normalize.apply(resolver, args);
      } else {
        option = undefined;
      }

      if (option === undefined) {
        option = definition.default;
        if (typeof option === 'function') {
          option = option.apply(resolver, appliedArgs);
        }
      }

      stack.pop();
      return option;

    } catch (err) {
      stack.pop();
      throw err;
    }
  }


  // Pre-process
  options = Object.keys(config).reduce(function(opts, key) {

    var definition = config[key];
    var option = options[key];

    if (!!option || options.hasOwnProperty(key)) {
      if (typeof option !== 'function') {
        option = normalize.call(resolver, definition.type, option);
        if (option !== undefined) {
          constants[key] = option;
          return opts;
        }
        // Fall through
      } else {
        opts[key] = option;
        return opts;
      }
    }

    var fallback = definition.default;
    if (typeof fallback !== 'function') {
      constants[key] = fallback;
    }

    return opts;
  }, {});


  return resolver;
}


module.exports = createResolver;
