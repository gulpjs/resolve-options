'use strict';

var expect = require('expect');

var createResolver = require('../');

describe('createResolver', function() {

  it('does not need a config or options object', function(done) {
    var resolver = createResolver();

    expect(resolver).toExist();

    done();
  });

  it('returns a resolver that contains a `resolve` method', function(done) {
    var resolver = createResolver();

    expect(resolver.resolve).toBeA('function');

    done();
  });

  it('accepts a config object', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: 'hello world',
      },
    };

    var resolver = createResolver(config);

    expect(resolver).toExist();

    done();
  });

  it('accepts an options object', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: 'hello world',
      },
    };

    var options = {};

    var resolver = createResolver(config, options);

    expect(resolver).toExist();

    done();
  });
});

describe('resolver.resolve', function() {

  it('takes a string key and returns a resolved option', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: 'hello world',
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolve('myOpt');

    expect(myOpt).toEqual('hello world');

    done();
  });

  it('returns undefined if a string key is not given', function(done) {
    var resolver = createResolver();

    var myOpt = resolver.resolve({});

    expect(myOpt).toEqual(undefined);

    done();
  });

  it('returns undefined if the key is not defined in the config object', function(done) {
    var resolver = createResolver();

    var myOpt = resolver.resolve('myOpt');

    expect(myOpt).toEqual(undefined);

    done();
  });

  it('resolves values against the defined type', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: 'hello world',
      },
    };

    var validOptions = {
      myOpt: 'foo',
    };

    var validResolver = createResolver(config, validOptions);

    var validOpt = validResolver.resolve('myOpt');

    expect(validOpt).toEqual('foo');

    var invalidOptions = {
      myOpt: 123,
    };

    var invalidResolver = createResolver(config, invalidOptions);

    var invalidOpt = invalidResolver.resolve('myOpt');

    expect(invalidOpt).toEqual('hello world');

    done();
  });

  it('resolves options that are given as a function, validating the return type', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: 'hello world',
      },
    };

    var validOptions = {
      myOpt: function() {
        return 'foo';
      },
    };

    var validResolver = createResolver(config, validOptions);

    var validOpt = validResolver.resolve('myOpt');

    expect(validOpt).toEqual('foo');

    var invalidOptions = {
      myOpt: function() {
        return 123;
      },
    };

    var invalidResolver = createResolver(config, invalidOptions);

    var invalidOpt = invalidResolver.resolve('myOpt');

    expect(invalidOpt).toEqual('hello world');

    done();
  });

  it('forwards extra arguments to an option function', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: 'hello world',
      },
    };

    var options = {
      myOpt: function(arg1, arg2) {
        expect(arg1).toEqual('arg1');
        expect(arg2).toEqual('arg2');
        return arg2;
      },
    };

    var resolver = createResolver(config, options);

    var myOpt = resolver.resolve('myOpt', 'arg1', 'arg2');

    expect(myOpt).toEqual('arg2');

    done();
  });

  it('binds the resolver to an option function', function(done) {
    var resolver;

    var config = {
      myOpt: {
        type: 'string',
        default: 'hello world',
      },
    };

    var options = {
      myOpt: function() {
        expect(this).toBe(resolver);
        return 'foo';
      },
    };

    resolver = createResolver(config, options);

    var myOpt = resolver.resolve('myOpt');

    expect(myOpt).toEqual('foo');

    done();
  });

  it('does not allow recursive resolution in options (to avoid blowing the stack)', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: 'hello world',
      },
    };

    var options = {
      myOpt: function() {
        return this.resolve('myOpt');
      },
    };

    var resolver = createResolver(config, options);

    function recursive() {
      resolver.resolve('myOpt');
    }

    expect(recursive).toThrow('Recursive resolution denied.');

    done();
  });

  it('supports custom type resolution with functions', function(done) {
    var now = new Date();

    var config = {
      myOpt: {
        type: function(value) {
          return value.constructor === Date ? value : null;
        },
        default: 'hello world',
      },
    };

    var options = {
      myOpt: now,
    };

    var resolver = createResolver(config, options);

    var myOpt = resolver.resolve('myOpt');

    expect(myOpt).toBe(now);

    done();
  });

  it('supports arrays of types', function(done) {
    var config = {
      myOpt: {
        type: ['string', 'boolean'],
        default: false,
      },
    };

    var strOptions = {
      myOpt: 'foo',
    };

    var strResolver = createResolver(config, strOptions);

    var strOpt = strResolver.resolve('myOpt');

    expect(strOpt).toEqual('foo');

    var boolOptions = {
      myOpt: true,
    };

    var boolResolver = createResolver(config, boolOptions);

    var boolOpt = boolResolver.resolve('myOpt');

    expect(boolOpt).toEqual(true);

    var invalidOptions = {
      myOpt: 123,
    };

    var invalidResolver = createResolver(config, invalidOptions);

    var invalidOpt = invalidResolver.resolve('myOpt');

    expect(invalidOpt).toEqual(false);

    done();
  });

  it('allows functions as default values', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: function() {
          return 'hello world';
        },
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolve('myOpt');

    expect(myOpt).toEqual('hello world');

    done();
  });

  it('forwards extra arguments to a default function', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: function(arg1, arg2) {
          expect(arg1).toEqual('arg1');
          expect(arg2).toEqual('arg2');
          return arg2;
        },
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolve('myOpt', 'arg1', 'arg2');

    expect(myOpt).toEqual('arg2');

    done();
  });

  it('binds the resolver to a default function', function(done) {
    var resolver;

    var config = {
      myOpt: {
        type: 'string',
        default: function() {
          expect(this).toBe(resolver);
          return 'hello world';
        },
      },
    };

    resolver = createResolver(config);

    var myOpt = resolver.resolve('myOpt');

    expect(myOpt).toEqual('hello world');

    done();
  });

  it('does not allow recursive resolution in defaults (to avoid blowing the stack)', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: function() {
          return this.resolve('myOpt');
        },
      },
    };

    var resolver = createResolver(config);

    function recursive() {
      resolver.resolve('myOpt');
    }

    expect(recursive).toThrow('Recursive resolution denied.');

    done();
  });

  it('does not verify your default matches the type', function(done) {
    var config = {
      myOpt: {
        type: 'string',
        default: 123,
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolve('myOpt');

    expect(myOpt).toEqual(123);

    done();
  });
});
