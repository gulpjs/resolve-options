"use strict";

var assert = require("node:assert");
var { describe, it } = require("node:test");

var createResolver = require("../");

describe("createResolver", function () {
  it("does not need a config or options object", function () {
    var resolver = createResolver();

    assert.ok(resolver);
  });

  it("returns a resolver that contains a `resolve` method", function () {
    var resolver = createResolver();

    assert.strictEqual(typeof resolver.resolve, "function");
  });

  it("returns a resolver that contains a `resolveConstant` method", function () {
    var resolver = createResolver();

    assert.strictEqual(typeof resolver.resolveConstant, "function");
  });

  it("accepts a config object", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var resolver = createResolver(config);

    assert.ok(resolver);
  });

  it("accepts an options object", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var options = {};

    var resolver = createResolver(config, options);

    assert.ok(resolver);
  });

  it("coerces just once for constant options", function () {
    var coerced = 0;
    var config = {
      myOpt: {
        type: function (value) {
          coerced++;
          return value;
        },
        default: "bye bye",
      },
    };

    var options = {
      myOpt: "hello world",
    };

    var resolver = createResolver(config, options);

    assert.ok(resolver);
    assert.strictEqual(coerced, 0);

    var myOpt1 = resolver.resolve("myOpt");
    assert.strictEqual(myOpt1, "hello world");
    assert.strictEqual(coerced, 1);

    var myOpt2 = resolver.resolve("myOpt");
    assert.strictEqual(myOpt2, "hello world");
    assert.strictEqual(coerced, 1);
  });
});

describe("resolver.resolve", function () {
  it("takes a string key and returns a resolved option", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolve("myOpt");

    assert.strictEqual(myOpt, "hello world");
  });

  it("returns undefined if a string key is not given", function () {
    var resolver = createResolver();

    var myOpt = resolver.resolve({});

    assert.strictEqual(myOpt, undefined);
  });

  it("returns undefined if the key is not defined in the config object", function () {
    var resolver = createResolver();

    var myOpt = resolver.resolve("myOpt");

    assert.strictEqual(myOpt, undefined);
  });

  it("resolves values against the defined type", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var validOptions = {
      myOpt: "foo",
    };

    var validResolver = createResolver(config, validOptions);

    var validOpt = validResolver.resolve("myOpt");

    assert.strictEqual(validOpt, "foo");

    var invalidOptions = {
      myOpt: 123,
    };

    var invalidResolver = createResolver(config, invalidOptions);

    var invalidOpt = invalidResolver.resolveConstant("myOpt");

    assert.strictEqual(invalidOpt, "hello world");
  });

  it("resolves options that are given as a function, validating the return type", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var validOptions = {
      myOpt: function () {
        return "foo";
      },
    };

    var validResolver = createResolver(config, validOptions);

    var validOpt = validResolver.resolve("myOpt");

    assert.strictEqual(validOpt, "foo");

    var invalidOptions = {
      myOpt: function () {
        return 123;
      },
    };

    var invalidResolver = createResolver(config, invalidOptions);

    var invalidOpt = invalidResolver.resolve("myOpt");

    assert.strictEqual(invalidOpt, "hello world");
  });

  it("forwards extra arguments to an option function", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var options = {
      myOpt: function (arg1, arg2) {
        assert.strictEqual(arg1, "arg1");
        assert.strictEqual(arg2, "arg2");
        return arg2;
      },
    };

    var resolver = createResolver(config, options);

    var myOpt = resolver.resolve("myOpt", "arg1", "arg2");

    assert.strictEqual(myOpt, "arg2");
  });

  it("binds the resolver to an option function", function () {
    var resolver;

    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var options = {
      myOpt: function () {
        assert.strictEqual(this, resolver);
        return "foo";
      },
    };

    resolver = createResolver(config, options);

    var myOpt = resolver.resolve("myOpt");

    assert.strictEqual(myOpt, "foo");
  });

  it("allows non-recursive nested resolution of options", function () {
    var config = {
      myOpt1: {
        type: "string",
      },
      myOpt2: {
        type: "string",
      },
    };

    var options = {
      myOpt1: function () {
        return "hello " + this.resolve("myOpt2");
      },
      myOpt2: "world",
    };

    var resolver = createResolver(config, options);

    var myOpt = resolver.resolve("myOpt1");
    assert.strictEqual(myOpt, "hello world");
  });

  it("allows non-recursive deeply nested resolution of options", function () {
    var config = {
      myOpt1: {
        type: "string",
      },
      myOpt2: {
        type: "string",
      },
      myOpt3: {
        type: "string",
      },
    };

    var options = {
      myOpt1: function () {
        return "hello" + this.resolve("myOpt2");
      },
      myOpt2: function () {
        return " " + this.resolve("myOpt3");
      },
      myOpt3: "world",
    };

    var resolver = createResolver(config, options);

    var myOpt = resolver.resolve("myOpt1");
    assert.strictEqual(myOpt, "hello world");
  });

  it("does not allow recursive resolution of options (to avoid blowing the stack)", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var options = {
      myOpt: function () {
        return this.resolve("myOpt");
      },
    };

    var resolver = createResolver(config, options);

    function recursive() {
      resolver.resolve("myOpt");
    }

    assert.throws(recursive, { message: "Recursive resolution denied." });
  });

  it("does not allow indirectly recursive resolution (to avoid blowing the stack)", function () {
    var config = {
      myOpt1: {
        type: "string",
        default: "hello world",
      },
      myOpt2: {
        type: "string",
        default: "bye bye",
      },
    };

    var options = {
      myOpt1: function () {
        return this.resolve("myOpt2");
      },
      myOpt2: function () {
        return this.resolve("myOpt1");
      },
    };

    var resolver = createResolver(config, options);

    function recursive() {
      resolver.resolve("myOpt1");
    }

    assert.throws(recursive, { message: "Recursive resolution denied." });
  });

  it("supports custom type resolution with functions", function () {
    var now = new Date();

    var config = {
      myOpt: {
        type: function (value) {
          return value.constructor === Date ? value : null;
        },
        default: "hello world",
      },
    };

    var options = {
      myOpt: now,
    };

    var resolver = createResolver(config, options);

    var myOpt = resolver.resolve("myOpt");

    assert.strictEqual(myOpt, now);
  });

  it("supports arrays of types", function () {
    var config = {
      myOpt: {
        type: ["string", "boolean"],
        default: false,
      },
    };

    var strOptions = {
      myOpt: "foo",
    };

    var strResolver = createResolver(config, strOptions);

    var strOpt = strResolver.resolve("myOpt");

    assert.strictEqual(strOpt, "foo");

    var boolOptions = {
      myOpt: true,
    };

    var boolResolver = createResolver(config, boolOptions);

    var boolOpt = boolResolver.resolve("myOpt");

    assert.strictEqual(boolOpt, true);

    var invalidOptions = {
      myOpt: 123,
    };

    var invalidResolver = createResolver(config, invalidOptions);

    var invalidOpt = invalidResolver.resolve("myOpt");

    assert.strictEqual(invalidOpt, false);
  });

  it("allows functions as default values", function () {
    var config = {
      myOpt: {
        type: "string",
        default: function () {
          return "hello world";
        },
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolve("myOpt");

    assert.strictEqual(myOpt, "hello world");
  });

  it("forwards extra arguments to a default function", function () {
    var config = {
      myOpt: {
        type: "string",
        default: function (arg1, arg2) {
          assert.strictEqual(arg1, "arg1");
          assert.strictEqual(arg2, "arg2");
          return arg2;
        },
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolve("myOpt", "arg1", "arg2");

    assert.strictEqual(myOpt, "arg2");
  });

  it("binds the resolver to a default function", function () {
    var resolver;

    var config = {
      myOpt: {
        type: "string",
        default: function () {
          assert.strictEqual(this, resolver);
          return "hello world";
        },
      },
    };

    resolver = createResolver(config);

    var myOpt = resolver.resolve("myOpt");

    assert.strictEqual(myOpt, "hello world");
  });

  it("does not allow recursive resolution in defaults (to avoid blowing the stack)", function () {
    var config = {
      myOpt: {
        type: "string",
        default: function () {
          return this.resolve("myOpt");
        },
      },
    };

    var resolver = createResolver(config);

    function recursive() {
      resolver.resolve("myOpt");
    }

    assert.throws(recursive, { message: "Recursive resolution denied." });
  });

  it("does not allow indirectly recursive resolution in defaults (to avoid blowing the stack)", function () {
    var config = {
      myOpt1: {
        type: "string",
        default: function () {
          return this.resolve("myOpt2");
        },
      },
      myOpt2: {
        type: "string",
        default: function () {
          return this.resolve("myOpt1");
        },
      },
    };

    var resolver = createResolver(config);

    function recursive() {
      resolver.resolve("myOpt1");
    }

    assert.throws(recursive, { message: "Recursive resolution denied." });
  });

  it("does not verify your default matches the type", function () {
    var config = {
      myOpt: {
        type: "string",
        default: 123,
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolve("myOpt");

    assert.strictEqual(myOpt, 123);
  });
});

describe("resolver.resolveConstant", function () {
  it("takes a string key and returns a resolved option", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolveConstant("myOpt");

    assert.strictEqual(myOpt, "hello world");
  });

  it("returns undefined if a string key is not given", function () {
    var resolver = createResolver();

    var myOpt = resolver.resolveConstant({});

    assert.strictEqual(myOpt, undefined);
  });

  it("returns undefined if the key is not defined in the config object", function () {
    var resolver = createResolver();

    var myOpt = resolver.resolveConstant("myOpt");

    assert.strictEqual(myOpt, undefined);
  });

  it("resolves values against the defined type", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var validOptions = {
      myOpt: "foo",
    };

    var validResolver = createResolver(config, validOptions);

    var validOpt = validResolver.resolveConstant("myOpt");

    assert.strictEqual(validOpt, "foo");

    var invalidOptions = {
      myOpt: 123,
    };

    var invalidResolver = createResolver(config, invalidOptions);

    var invalidOpt = invalidResolver.resolve("myOpt");

    assert.strictEqual(invalidOpt, "hello world");
  });

  it("does not resolve options that are given as a function", function () {
    var config = {
      myOpt: {
        type: "string",
        default: "hello world",
      },
    };

    var validOptions = {
      myOpt: function () {
        return "foo";
      },
    };

    var validResolver = createResolver(config, validOptions);

    var validOpt = validResolver.resolveConstant("myOpt");

    assert.strictEqual(validOpt, undefined);
  });

  it("supports custom type resolution with functions", function () {
    var now = new Date();

    var config = {
      myOpt: {
        type: function (value) {
          return value.constructor === Date ? value : null;
        },
        default: "hello world",
      },
    };

    var options = {
      myOpt: now,
    };

    var resolver = createResolver(config, options);

    var myOpt = resolver.resolveConstant("myOpt");

    assert.strictEqual(myOpt, now);
  });

  it("supports arrays of types", function () {
    var config = {
      myOpt: {
        type: ["string", "boolean"],
        default: false,
      },
    };

    var strOptions = {
      myOpt: "foo",
    };

    var strResolver = createResolver(config, strOptions);

    var strOpt = strResolver.resolveConstant("myOpt");

    assert.strictEqual(strOpt, "foo");

    var boolOptions = {
      myOpt: true,
    };

    var boolResolver = createResolver(config, boolOptions);

    var boolOpt = boolResolver.resolveConstant("myOpt");

    assert.strictEqual(boolOpt, true);

    var invalidOptions = {
      myOpt: 123,
    };

    var invalidResolver = createResolver(config, invalidOptions);

    var invalidOpt = invalidResolver.resolveConstant("myOpt");

    assert.strictEqual(invalidOpt, false);
  });

  it("does not verify your default matches the type", function () {
    var config = {
      myOpt: {
        type: "string",
        default: 123,
      },
    };

    var resolver = createResolver(config);

    var myOpt = resolver.resolveConstant("myOpt");

    assert.strictEqual(myOpt, 123);
  });
});
