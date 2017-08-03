'use strict';

var normalize = require('value-or-function');

var slice = Array.prototype.slice;

function createResolver(config, options) {
  // TODO: should the config object be validated?
  config = config || {};
  options = options || {};

  var resolver = {
    resolveConstant: resolveConstant,
    resolve: resolve,
  };


  // Keep constants separately
  var constants = {};

  function resolveConstant(key) {
    if (constants.hasOwnProperty(key)) {
      return constants[key];
    }

    var definition = config[key];
    // Ignore options that are not defined
    if (!definition) {
      return;
    }

    var option = options[key];

    if (!!option || options.hasOwnProperty(key)) {
      if (typeof option !== 'function') {
        option = normalize.call(resolver, definition.type, option);
        if (option != null) {
          constants[key] = option;
          return option;
        }
        // Fall through
      } else {
        return;
      }
    }

    var fallback = definition.default;
    if (option == null && typeof fallback !== 'function') {
      constants[key] = fallback;
      return fallback;
    }
  }


  // Keep requested keys to detect (and disallow) recursive resolution
  var stack = [];

  function resolve(key) {
    var option = resolveConstant(key);
    if (option != null) {
      return option;
    }

    var definition = config[key];
    // Ignore options that are not defined
    if (!definition) {
      return;
    }

    if (stack.indexOf(key) >= 0) {
      throw new Error('Recursive resolution denied.');
    }

    stack.push(key);
    try {
      option = options[key];
      var appliedArgs = slice.call(arguments, 1);
      var args = [definition.type, option].concat(appliedArgs);

      if (typeof option === 'function') {
        option = normalize.apply(resolver, args);
      }

      if (option == null) {
        option = definition.default;
        if (typeof option === 'function') {
          option = option.apply(resolver, appliedArgs);
        }
      }

      return option;

    } finally {
      stack.pop();
    }
  }

  return resolver;
}

module.exports = createResolver;
