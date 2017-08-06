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

  var lastKey;

  function resolve(key) {
    if (typeof key !== 'string') {
      return;
    }

    var appliedArgs = slice.call(arguments, 1);

    var definition = config[key];
    // Ignore options that are not defined
    if (!definition) {
      return;
    }

    if (key === lastKey) {
      throw new Error('Recursive resolution denied.');
    }
    lastKey = key;

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

    lastKey = null;

    if (result == null) {
      return fallback;
    }
    return result;
  }

  return resolver;
}

module.exports = createResolver;
