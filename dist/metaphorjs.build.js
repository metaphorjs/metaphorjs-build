"use strict";
/* BUNDLE START 003 */

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var fs, path, esprima, glob, cp;
fs = require("fs");
path = require("path");
esprima = require("esprima");
glob = require("glob");
cp = require("child_process");
var MetaphorJs = {};

function isFunction(value) {
  return typeof value == 'function';
}

;
var toString = Object.prototype.toString;
var undf = undefined;

var varType = function () {
  var types = {
    '[object String]': 0,
    '[object Number]': 1,
    '[object Boolean]': 2,
    '[object Object]': 3,
    '[object Function]': 4,
    '[object Array]': 5,
    '[object RegExp]': 9,
    '[object Date]': 10
  };
  /*
   * 'string': 0,
   * 'number': 1,
   * 'boolean': 2,
   * 'object': 3,
   * 'function': 4,
   * 'array': 5,
   * 'null': 6,
   * 'undefined': 7,
   * 'NaN': 8,
   * 'regexp': 9,
   * 'date': 10,
   * unknown: -1
   * @param {*} value
   * @returns {number}
   */

  return function varType(val) {
    if (!val) {
      if (val === null) {
        return 6;
      }

      if (val === undf) {
        return 7;
      }
    }

    var num = types[toString.call(val)];

    if (num === undf) {
      return -1;
    }

    if (num === 1 && isNaN(val)) {
      return 8;
    }

    return num;
  };
}();

function isString(value) {
  return typeof value == "string" || value === "" + value; //return typeof value == "string" || varType(value) === 0;
}

;
/**
 * @param {*} value
 * @returns {boolean}
 */

function isArray(value) {
  return _typeof(value) === "object" && varType(value) === 5;
}

;
var strUndef = "undefined";

function isObject(value) {
  if (value === null || _typeof(value) != "object") {
    return false;
  }

  var vt = varType(value);
  return vt > 2 || vt == -1;
}

;

var Cache = function () {
  var globalCache;
  /**
   * @class Cache
   */

  /**
   * @constructor
   * @param {bool} cacheRewritable
   */

  var Cache = function Cache(cacheRewritable) {
    var storage = {},
        finders = [];

    if (arguments.length == 0) {
      cacheRewritable = true;
    }

    return {
      /**
       * @param {function} fn
       * @param {object} context
       * @param {bool} prepend
       */
      addFinder: function addFinder(fn, context, prepend) {
        finders[prepend ? "unshift" : "push"]({
          fn: fn,
          context: context
        });
      },

      /**
       * @method
       * @param {string} name
       * @param {*} value
       * @param {bool} rewritable
       * @returns {*} value
       */
      add: function add(name, value, rewritable) {
        if (storage[name] && storage[name].rewritable === false) {
          return storage[name];
        }

        storage[name] = {
          rewritable: _typeof(rewritable) != strUndef ? rewritable : cacheRewritable,
          value: value
        };
        return value;
      },

      /**
       * @method
       * @param {string} name
       * @returns {*}
       */
      get: function get(name) {
        if (!storage[name]) {
          if (finders.length) {
            var i,
                l,
                res,
                self = this;

            for (i = 0, l = finders.length; i < l; i++) {
              res = finders[i].fn.call(finders[i].context, name, self);

              if (res !== undf) {
                return self.add(name, res, true);
              }
            }
          }

          return undf;
        }

        return storage[name].value;
      },

      /**
       * @method
       * @param {string} name
       * @returns {*}
       */
      remove: function remove(name) {
        var rec = storage[name];

        if (rec && rec.rewritable === true) {
          delete storage[name];
        }

        return rec ? rec.value : undf;
      },

      /**
       * @method
       * @param {string} name
       * @returns {boolean}
       */
      exists: function exists(name) {
        return !!storage[name];
      },

      /**
       * @param {function} fn
       * @param {object} context
       */
      eachEntry: function eachEntry(fn, context) {
        var k;

        for (k in storage) {
          fn.call(context, storage[k].value, k);
        }
      },

      /**
       * @method
       */
      destroy: function destroy() {
        var self = this;

        if (self === globalCache) {
          globalCache = null;
        }

        storage = null;
        cacheRewritable = null;
        self.add = null;
        self.get = null;
        self.destroy = null;
        self.exists = null;
        self.remove = null;
      }
    };
  };
  /**
   * @method
   * @static
   * @returns {Cache}
   */


  Cache.global = function () {
    if (!globalCache) {
      globalCache = new Cache(true);
    }

    return globalCache;
  };

  return Cache;
}();
/**
 * @class Namespace
 * @code ../examples/main.js
 */


var Namespace = function () {
  /**
   * @param {Object} root optional; usually window or global
   * @param {String} rootName optional. If you want custom object to be root and
   * this object itself is the first level of namespace
   * @param {Cache} cache optional
   * @constructor
   */
  var Namespace = function Namespace(root, rootName, cache) {
    cache = cache || new Cache(false);
    var self = this,
        rootL = rootName ? rootName.length : null;

    if (!root) {
      if ((typeof global === "undefined" ? "undefined" : _typeof(global)) !== strUndef) {
        root = global;
      } else {
        root = window;
      }
    }

    var normalize = function normalize(ns) {
      if (ns && rootName && ns.substr(0, rootL) !== rootName) {
        return rootName + "." + ns;
      }

      return ns;
    };

    var parseNs = function parseNs(ns) {
      ns = normalize(ns);
      var tmp = ns.split("."),
          i,
          last = tmp.pop(),
          parent = tmp.join("."),
          len = tmp.length,
          name,
          current = root;

      if (cache[parent]) {
        return [cache[parent], last, ns];
      }

      if (len > 0) {
        for (i = 0; i < len; i++) {
          name = tmp[i];

          if (rootName && i === 0 && name === rootName) {
            current = root;
            continue;
          }

          if (current[name] === undf) {
            current[name] = {};
          }

          current = current[name];
        }
      }

      return [current, last, ns];
    };
    /**
     * Get namespace/cache object
     * @method
     * @param {string} ns
     * @param {bool} cacheOnly
     * @returns {*}
     */


    var get = function get(ns, cacheOnly) {
      ns = normalize(ns);

      if (cache.exists(ns)) {
        return cache.get(ns);
      }

      if (cacheOnly) {
        return undf;
      }

      var tmp = ns.split("."),
          i,
          len = tmp.length,
          name,
          current = root;

      for (i = 0; i < len; i++) {
        name = tmp[i];

        if (rootName && i === 0 && name === rootName) {
          current = root;
          continue;
        }

        if (current[name] === undf) {
          return undf;
        }

        current = current[name];
      }

      if (current) {
        cache.add(ns, current);
      }

      return current;
    };
    /**
     * Register item
     * @method
     * @param {string} ns
     * @param {*} value
     */


    var register = function register(ns, value) {
      var parse = parseNs(ns),
          parent = parse[0],
          name = parse[1];

      if (isObject(parent) && parent[name] === undf) {
        parent[name] = value;
        cache.add(parse[2], value);
      }

      return value;
    };
    /**
     * Item exists
     * @method
     * @param {string} ns
     * @returns boolean
     */


    var exists = function exists(ns) {
      return get(ns, true) !== undf;
    };
    /**
     * Add item only to the cache
     * @function add
     * @param {string} ns
     * @param {*} value
     */


    var add = function add(ns, value) {
      ns = normalize(ns);
      cache.add(ns, value);
      return value;
    };
    /**
     * Remove item from cache
     * @method
     * @param {string} ns
     */


    var remove = function remove(ns) {
      ns = normalize(ns);
      cache.remove(ns);
    };
    /**
     * Make alias in the cache
     * @method
     * @param {string} from
     * @param {string} to
     */


    var makeAlias = function makeAlias(from, to) {
      from = normalize(from);
      to = normalize(to);
      var value = cache.get(from);

      if (value !== undf) {
        cache.add(to, value);
      }
    };
    /**
     * Destroy namespace and all classes in it
     * @method
     */


    var destroy = function destroy() {
      var self = this,
          k;

      if (self === globalNs) {
        globalNs = null;
      }

      cache.eachEntry(function (entry) {
        if (entry && entry.$destroy) {
          entry.$destroy();
        }
      });
      cache.destroy();
      cache = null;

      for (k in self) {
        self[k] = null;
      }
    };

    self.register = register;
    self.exists = exists;
    self.get = get;
    self.add = add;
    self.remove = remove;
    self.normalize = normalize;
    self.makeAlias = makeAlias;
    self.destroy = destroy;
  };

  var p = Namespace.prototype;
  p.register = p.exists = p.get = p.add = p.remove = p.normalize = p.makeAlias = p.destroy = null;
  p = null;
  var globalNs;
  /**
   * Get global namespace
   * @method
   * @static
   * @returns {Namespace}
   */

  Namespace.global = function () {
    if (!globalNs) {
      globalNs = new Namespace();
    }

    return globalNs;
  };

  return Namespace;
}();

var slice = Array.prototype.slice;

function isPlainObject(value) {
  // IE < 9 returns [object Object] from toString(htmlElement)
  return _typeof(value) == "object" && varType(value) === 3 && !value.nodeType && value.constructor === Object;
}

;

function isBool(value) {
  return value === true || value === false;
}

;

var extend = function () {
  /**
   * @param {Object} dst
   * @param {Object} src
   * @param {Object} src2 ... srcN
   * @param {boolean} override = false
   * @param {boolean} deep = false
   * @returns {object}
   */
  var extend = function extend() {
    var override = false,
        deep = false,
        args = slice.call(arguments),
        dst = args.shift(),
        src,
        k,
        value;

    if (isBool(args[args.length - 1])) {
      override = args.pop();
    }

    if (isBool(args[args.length - 1])) {
      deep = override;
      override = args.pop();
    }

    while (args.length) {
      // IE < 9 fix: check for hasOwnProperty presence
      if ((src = args.shift()) && src.hasOwnProperty) {
        for (k in src) {
          if (src.hasOwnProperty(k) && (value = src[k]) !== undf) {
            if (deep) {
              if (dst[k] && isPlainObject(dst[k]) && isPlainObject(value)) {
                extend(dst[k], value, override, deep);
              } else {
                if (override === true || dst[k] == undf) {
                  // == checks for null and undefined
                  if (isPlainObject(value)) {
                    dst[k] = {};
                    extend(dst[k], value, override, true);
                  } else {
                    dst[k] = value;
                  }
                }
              }
            } else {
              if (override === true || dst[k] == undf) {
                dst[k] = value;
              }
            }
          }
        }
      }
    }

    return dst;
  };

  return extend;
}();

function emptyFn() {}

;

var instantiate = function instantiate(fn, args) {
  var Temp = function Temp() {},
      inst,
      ret;

  Temp.prototype = fn.prototype;
  inst = new Temp();
  ret = fn.apply(inst, args); // If an object has been returned then return it otherwise
  // return the original instance.
  // (consistent with behaviour of the new operator)

  return isObject(ret) || ret === false ? ret : inst;
};
/**
 * Function interceptor
 * @param {function} origFn
 * @param {function} interceptor
 * @param {object|null} context
 * @param {object|null} origContext
 * @param {string} when
 * @param {bool} replaceValue
 * @returns {Function}
 */


function intercept(origFn, interceptor, context, origContext, when, replaceValue) {
  when = when || "before";
  return function () {
    var intrRes, origRes;

    if (when == "instead") {
      return interceptor.apply(context || origContext, arguments);
    } else if (when == "before") {
      intrRes = interceptor.apply(context || origContext, arguments);
      origRes = intrRes !== false ? origFn.apply(origContext || context, arguments) : null;
    } else {
      origRes = origFn.apply(origContext || context, arguments);
      intrRes = interceptor.apply(context || origContext, arguments);
    }

    return replaceValue ? intrRes : origRes;
  };
}

;

var Class = function () {
  var proto = "prototype",
      constr = "$constructor",
      $constr = function $constr() {
    var self = this;

    if (self.$super && self.$super !== emptyFn) {
      self.$super.apply(self, arguments);
    }
  },
      wrapPrototypeMethod = function wrapPrototypeMethod(parent, k, fn) {
    var $super = parent[proto][k] || (k === constr ? parent : emptyFn) || emptyFn;
    return function () {
      var ret,
          self = this,
          prev = self.$super;

      if (self.$destroyed) {
        self.$super = null;
        return null;
      }

      self.$super = $super;
      ret = fn.apply(self, arguments);
      self.$super = prev;
      return ret;
    };
  },
      preparePrototype = function preparePrototype(prototype, cls, parent, onlyWrap) {
    var k,
        ck,
        pk,
        pp = parent[proto];

    for (k in cls) {
      if (cls.hasOwnProperty(k)) {
        pk = pp[k];
        ck = cls[k];
        prototype[k] = isFunction(ck) && (!pk || isFunction(pk)) ? wrapPrototypeMethod(parent, k, ck) : ck;
      }
    }

    if (onlyWrap) {
      return;
    }

    prototype.$plugins = null;
    prototype.$pluginMap = null;

    if (pp.$beforeInit) {
      prototype.$beforeInit = pp.$beforeInit.slice();
      prototype.$afterInit = pp.$afterInit.slice();
      prototype.$beforeDestroy = pp.$beforeDestroy.slice();
      prototype.$afterDestroy = pp.$afterDestroy.slice();
    } else {
      prototype.$beforeInit = [];
      prototype.$afterInit = [];
      prototype.$beforeDestroy = [];
      prototype.$afterDestroy = [];
    }
  },
      mixinToPrototype = function mixinToPrototype(prototype, mixin) {
    var k;

    for (k in mixin) {
      if (mixin.hasOwnProperty(k)) {
        if (k === "$beforeInit") {
          prototype.$beforeInit.push(mixin[k]);
        } else if (k === "$afterInit") {
          prototype.$afterInit.push(mixin[k]);
        } else if (k === "$beforeDestroy") {
          prototype.$beforeDestroy.push(mixin[k]);
        } else if (k === "$afterDestroy") {
          prototype.$afterDestroy.push(mixin[k]);
        } else if (!prototype[k]) {
          prototype[k] = mixin[k];
        }
      }
    }
  };

  var _Class = function Class(ns) {
    if (!ns) {
      ns = new Namespace();
    }

    var createConstructor = function createConstructor(className) {
      return function () {
        var self = this,
            before = [],
            after = [],
            args = arguments,
            newArgs,
            i,
            l,
            plugins,
            plugin,
            pmap,
            plCls;

        if (!self) {
          throw "Must instantiate via new: " + className;
        }

        self.$plugins = [];
        newArgs = self[constr].apply(self, arguments);

        if (newArgs && isArray(newArgs)) {
          args = newArgs;
        }

        plugins = self.$plugins;
        pmap = self.$pluginMap = {};

        for (i = -1, l = self.$beforeInit.length; ++i < l; before.push([self.$beforeInit[i], self])) {}

        for (i = -1, l = self.$afterInit.length; ++i < l; after.push([self.$afterInit[i], self])) {}

        if (plugins && plugins.length) {
          for (i = 0, l = plugins.length; i < l; i++) {
            plugin = plugins[i];

            if (isString(plugin)) {
              plCls = plugin;
              plugin = ns.get(plugin, true);

              if (!plugin) {
                throw plCls + " not found";
              }
            }

            plugin = new plugin(self, args);
            pmap[plugin.$class] = plugin;

            if (plugin.$beforeHostInit) {
              before.push([plugin.$beforeHostInit, plugin]);
            }

            if (plugin.$afterHostInit) {
              after.push([plugin.$afterHostInit, plugin]);
            }

            plugins[i] = plugin;
          }
        }

        for (i = -1, l = before.length; ++i < l; before[i][0].apply(before[i][1], args)) {}

        if (self.$init) {
          self.$init.apply(self, args);
        }

        for (i = -1, l = after.length; ++i < l; after[i][0].apply(after[i][1], args)) {}
      };
    };
    /**
     * @class BaseClass
     * @description All classes defined with MetaphorJs.Class extend this class.
     * You can access it via <code>cs.BaseClass</code>. Basically,
     * <code>cs.define({});</code> is the same as <code>cs.BaseClass.$extend({})</code>.
     * @constructor
     */


    var BaseClass = function BaseClass() {};

    extend(BaseClass.prototype, {
      $class: null,
      $extends: null,
      $plugins: null,
      $pluginMap: null,
      $mixins: null,
      $destroyed: false,
      $destroying: false,
      $constructor: emptyFn,
      $init: emptyFn,
      $beforeInit: [],
      $afterInit: [],
      $beforeDestroy: [],
      $afterDestroy: [],

      /**
       * Get class name
       * @method
       * @returns {string}
       */
      $getClass: function $getClass() {
        return this.$class;
      },

      /**
       * @param {string} cls
       * @returns {boolean}
       */
      $is: function $is(cls) {
        return isInstanceOf(this, cls);
      },

      /**
       * Get parent class name
       * @method
       * @returns {string | null}
       */
      $getParentClass: function $getParentClass() {
        return this.$extends;
      },

      /**
       * Intercept method
       * @method
       * @param {string} method Intercepted method name
       * @param {function} fn function to call before or after intercepted method
       * @param {object} newContext optional interceptor's "this" object
       * @param {string} when optional, when to call interceptor before | after | instead; default "before"
       * @param {bool} replaceValue optional, return interceptor's return value or original method's; default false
       * @returns {function} original method
       */
      $intercept: function $intercept(method, fn, newContext, when, replaceValue) {
        var self = this,
            orig = self[method];
        self[method] = intercept(orig || emptyFn, fn, newContext || self, self, when, replaceValue);
        return orig || emptyFn;
      },

      /**
       * Implement new methods or properties on instance
       * @param {object} methods
       */
      $implement: function $implement(methods) {
        var $self = this.constructor;

        if ($self && $self.$parent) {
          preparePrototype(this, methods, $self.$parent, true);
        }
      },

      /**
       * Does this instance have a plugin
       * @param cls
       * @returns {boolean}
       */
      $hasPlugin: function $hasPlugin(cls) {
        return !!this.$pluginMap[ns.normalize(cls)];
      },

      /**
       * @param {string} cls
       * @returns {object|null}
       */
      $getPlugin: function $getPlugin(cls) {
        return this.$pluginMap[ns.normalize(cls)] || null;
      },

      /**
       * @param {function} fn
       * @returns {Function}
       */
      $bind: function $bind(fn) {
        var self = this;
        return function () {
          if (!self.$isDestroyed()) {
            return fn.apply(self, arguments);
          }
        };
      },

      /**
       * @return boolean
       */
      $isDestroyed: function $isDestroyed() {
        return self.$destroying || self.$destroyed;
      },

      /**
       * Destroy instance
       * @method
       */
      $destroy: function $destroy() {
        var self = this,
            before = self.$beforeDestroy,
            after = self.$afterDestroy,
            plugins = self.$plugins,
            i,
            l,
            res;

        if (self.$destroying || self.$destroyed) {
          return;
        }

        self.$destroying = true;

        for (i = -1, l = before.length; ++i < l; before[i].apply(self, arguments)) {}

        for (i = 0, l = plugins.length; i < l; i++) {
          if (plugins[i].$beforeHostDestroy) {
            plugins[i].$beforeHostDestroy.call(plugins[i], arguments);
          }
        }

        res = self.destroy.apply(self, arguments);

        for (i = -1, l = after.length; ++i < l; after[i].apply(self, arguments)) {}

        for (i = 0, l = plugins.length; i < l; i++) {
          plugins[i].$destroy.apply(plugins[i], arguments);
        }

        if (res !== false) {
          for (i in self) {
            if (self.hasOwnProperty(i)) {
              self[i] = null;
            }
          }
        }

        self.$destroying = false;
        self.$destroyed = true;
      },
      destroy: function destroy() {}
    });
    BaseClass.$self = BaseClass;
    /**
     * Create an instance of current class. Same as cs.factory(name)
     * @method
     * @static
     * @code var myObj = My.Class.$instantiate(arg1, arg2, ...);
     * @returns {object} class instance
     */

    BaseClass.$instantiate = function () {
      var cls = this,
          args = arguments,
          cnt = args.length; // lets make it ugly, but without creating temprorary classes and leaks.
      // and fallback to normal instantiation.

      switch (cnt) {
        case 0:
          return new cls();

        case 1:
          return new cls(args[0]);

        case 2:
          return new cls(args[0], args[1]);

        case 3:
          return new cls(args[0], args[1], args[2]);

        case 4:
          return new cls(args[0], args[1], args[2], args[3]);

        default:
          return instantiate(cls, args);
      }
    };
    /**
     * Override class methods (on prototype level, not on instance level)
     * @method
     * @static
     * @param {object} methods
     */


    BaseClass.$override = function (methods) {
      var $self = this.$self,
          $parent = this.$parent;

      if ($self && $parent) {
        preparePrototype($self.prototype, methods, $parent);
      }
    };
    /**
     * Create new class based on current one
     * @param {object} definition
     * @param {object} statics
     * @returns {function}
     */


    BaseClass.$extend = function (definition, statics) {
      return defineClass(definition, statics, this);
    };
    /**
     * Destroy class
     * @method
     */


    BaseClass.$destroy = function () {
      var self = this,
          k;

      for (k in self) {
        self[k] = null;
      }
    };
    /**
     * @class Class
     */

    /**
     * @method Class
     * @constructor
     * @param {Namespace} ns optional namespace. See metaphorjs-namespace repository
     */

    /**
     * @method
     * @param {object} definition {
     *  @type {string} $class optional
     *  @type {string} $extends optional
     *  @type {array} $mixins optional
     *  @type {function} $constructor optional
     *  @type {function} $init optional
     *  @type {function} $beforeInit if this is a mixin
     *  @type {function} $afterInit if this is a mixin
     *  @type {function} $beforeHostInit if this is a plugin
     *  @type {function} $afterHostInit if this is a plugin
     *  @type {function} $beforeDestroy if this is a mixin
     *  @type {function} $afterDestroy if this is a mixin
     *  @type {function} $beforeHostDestroy if this is a plugin
     *  @type {function} destroy your own destroy function
     * }
     * @param {object} statics any statis properties or methods
     * @param {string|function} $extends this is a private parameter; use definition.$extends
     * @code var cls = cs.define({$class: "Name"});
     */


    var defineClass = function defineClass(definition, statics, $extends) {
      definition = definition || {};
      var name = definition.$class,
          parentClass = $extends || definition.$extends,
          mixins = definition.$mixins,
          alias = definition.$alias,
          pConstructor,
          i,
          l,
          k,
          noop,
          prototype,
          c,
          mixin;

      if (parentClass) {
        if (isString(parentClass)) {
          pConstructor = ns.get(parentClass);
        } else {
          pConstructor = parentClass;
          parentClass = pConstructor.$class || "";
        }
      } else {
        pConstructor = BaseClass;
        parentClass = "";
      }

      if (parentClass && !pConstructor) {
        throw parentClass + " not found";
      }

      if (name) {
        name = ns.normalize(name);
      }

      definition.$class = name;
      definition.$extends = parentClass;
      definition.$mixins = null; //noop                = function(){};
      //noop[proto]         = pConstructor[proto];
      //prototype           = new noop;
      //noop                = null;

      prototype = Object.create(pConstructor[proto]);
      definition[constr] = definition[constr] || $constr;
      preparePrototype(prototype, definition, pConstructor);

      if (mixins) {
        for (i = 0, l = mixins.length; i < l; i++) {
          mixin = mixins[i];

          if (isString(mixin)) {
            mixin = ns.get(mixin, true);
          }

          mixinToPrototype(prototype, mixin);
        }
      }

      c = createConstructor(name);
      prototype.constructor = c;
      prototype.$self = c;
      c[proto] = prototype;

      for (k in BaseClass) {
        if (k !== proto && BaseClass.hasOwnProperty(k)) {
          c[k] = BaseClass[k];
        }
      }

      for (k in pConstructor) {
        if (k !== proto && pConstructor.hasOwnProperty(k)) {
          c[k] = pConstructor[k];
        }
      }

      if (statics) {
        for (k in statics) {
          if (k !== proto && statics.hasOwnProperty(k)) {
            c[k] = statics[k];
          }
        }
      }

      c.$parent = pConstructor;
      c.$self = c;

      if (name) {
        ns.register(name, c);
      }

      if (alias) {
        ns.register(alias, c);
      }

      return c;
    };
    /**
     * Instantiate class. Pass constructor parameters after "name"
     * @method
     * @code cs.factory("My.Class.Name", arg1, arg2, ...);
     * @param {string} name Full name of the class
     * @returns {object} class instance
     */


    var factory = function factory(name) {
      var cls = ns.get(name),
          args = slice.call(arguments, 1);

      if (!cls) {
        throw name + " not found";
      }

      return cls.$instantiate.apply(cls, args);
    };
    /**
     * Is cmp instance of cls
     * @method
     * @code cs.instanceOf(myObj, "My.Class");
     * @code cs.instanceOf(myObj, My.Class);
     * @param {object} cmp
     * @param {string|object} cls
     * @returns {boolean}
     */


    var isInstanceOf = function isInstanceOf(cmp, cls) {
      var _cls = isString(cls) ? ns.get(cls) : cls;

      return _cls ? cmp instanceof _cls : false;
    };
    /**
     * Is one class subclass of another class
     * @method
     * @code cs.isSubclassOf("My.Subclass", "My.Class");
     * @code cs.isSubclassOf(myObj, "My.Class");
     * @code cs.isSubclassOf("My.Subclass", My.Class);
     * @code cs.isSubclassOf(myObj, My.Class);
     * @param {string|object} childClass
     * @param {string|object} parentClass
     * @return {boolean}
     */


    var isSubclassOf = function isSubclassOf(childClass, parentClass) {
      var p = childClass,
          g = ns.get;

      if (!isString(parentClass)) {
        parentClass = parentClass.prototype.$class;
      } else {
        parentClass = ns.normalize(parentClass);
      }

      if (isString(childClass)) {
        p = g(ns.normalize(childClass));
      }

      while (p && p.prototype) {
        if (p.prototype.$class === parentClass) {
          return true;
        }

        p = p.$parent;
      }

      return false;
    };

    var self = this;
    self.factory = factory;
    self.isSubclassOf = isSubclassOf;
    self.isInstanceOf = isInstanceOf;
    self.define = defineClass;

    self.destroy = function () {
      if (self === globalCs) {
        globalCs = null;
      }

      BaseClass.$destroy();
      BaseClass = null;
      ns.destroy();
      ns = null;
      _Class = null;
    };
    /**
     * @type {BaseClass} BaseClass reference to the BaseClass class
     */


    self.BaseClass = BaseClass;
  };

  _Class.prototype = {
    factory: null,
    isSubclassOf: null,
    isInstanceOf: null,
    define: null,
    destroy: null
  };
  var globalCs;
  /**
   * Get default global class manager
   * @method
   * @static
   * @returns {Class}
   */

  _Class.global = function () {
    if (!globalCs) {
      globalCs = new _Class(Namespace.global());
    }

    return globalCs;
  };

  return _Class;
}();

var ns = new Namespace(MetaphorJs, "MetaphorJs");
var cs = new Class(ns);
var defineClass = cs.define;

function isRegExp(value) {
  return varType(value) === 9;
}

;

function isDate(value) {
  return varType(value) === 10;
}

;

var copy = function () {
  var win = (typeof window === "undefined" ? "undefined" : _typeof(window)) != strUndef ? window : null,
      glob = (typeof global === "undefined" ? "undefined" : _typeof(global)) != strUndef ? global : null;

  var copy = function copy(source, dest) {
    if (win && source === win) {
      throw new Error("Cannot copy window object");
    }

    if (glob && source === glob) {
      throw new Error("Cannot copy global object");
    }

    if (!dest) {
      dest = source;

      if (source) {
        if (isArray(source)) {
          dest = copy(source, []);
        } else if (isDate(source)) {
          dest = new Date(source.getTime());
        } else if (isRegExp(source)) {
          dest = new RegExp(source.source);
        } else if (isPlainObject(source)) {
          dest = copy(source, {});
        }
      }
    } else {
      if (source === dest) {
        throw new Error("Objects are identical");
      }

      if (isArray(source)) {
        dest.length = 0;

        for (var i = 0, l = source.length; i < l; i++) {
          dest.push(copy(source[i]));
        }
      } else {
        var key;

        for (key in dest) {
          delete dest[key];
        }

        for (key in source) {
          if (source.hasOwnProperty(key)) {
            if (key.charAt(0) == '$' || isFunction(source[key])) {
              dest[key] = source[key];
            } else {
              dest[key] = copy(source[key]);
            }
          }
        }
      }
    }

    return dest;
  };

  return copy;
}();
/**
 * @param {Function} fn
 * @param {*} context
 */


var bind = Function.prototype.bind ? function (fn, context) {
  return fn.bind(context);
} : function (fn, context) {
  return function () {
    return fn.apply(context, arguments);
  };
};

var nextUid = function () {
  var uid = ['0', '0', '0']; // from AngularJs

  /**
   * @returns {String}
   */

  return function nextUid() {
    var index = uid.length;
    var digit;

    while (index) {
      index--;
      digit = uid[index].charCodeAt(0);

      if (digit == 57
      /*'9'*/
      ) {
          uid[index] = 'A';
          return uid.join('');
        }

      if (digit == 90
      /*'Z'*/
      ) {
          uid[index] = '0';
        } else {
        uid[index] = String.fromCharCode(digit + 1);
        return uid.join('');
      }
    }

    uid.unshift('0');
    return uid.join('');
  };
}();
/**
 * @param {Function} fn
 * @param {Object} context
 * @param {[]} args
 * @param {number} timeout
 */


function async(fn, context, args, timeout) {
  return setTimeout(function () {
    fn.apply(context, args || []);
  }, timeout || 0);
}

;
/**
 * This class is private - you can't create an event other than via Observable.
 * See {@link class:Observable} reference.
 * @class ObservableEvent
 * @private
 */

var ObservableEvent = function ObservableEvent(name, options) {
  var self = this;
  self.name = name;
  self.listeners = [];
  self.map = {};
  self.hash = nextUid();
  self.uni = '$$' + name + '_' + self.hash;
  self.suspended = false;
  self.lid = 0;

  if (_typeof(options) === "object" && options !== null) {
    extend(self, options, true, false);
  } else {
    self.returnResult = options;
  }
};

extend(ObservableEvent.prototype, {
  name: null,
  listeners: null,
  map: null,
  hash: null,
  uni: null,
  suspended: false,
  lid: null,
  returnResult: null,
  autoTrigger: null,
  lastTrigger: null,
  triggerFilter: null,
  filterContext: null,
  expectPromises: false,
  resolvePromises: false,

  /**
   * Get event name
   * @method
   * @returns {string}
   */
  getName: function getName() {
    return this.name;
  },

  /**
   * @method
   */
  destroy: function destroy() {
    var self = this,
        k;

    for (k in self) {
      self[k] = null;
    }
  },

  /**
   * @method
   * @param {function} fn Callback function { @required }
   * @param {object} context Function's "this" object
   * @param {object} options See {@link class:Observable.on}
   */
  on: function on(fn, context, options) {
    if (!fn) {
      return null;
    }

    context = context || null;
    options = options || {};
    var self = this,
        uni = self.uni,
        uniContext = fn || context;

    if (uniContext[uni] && !options.allowDupes) {
      return null;
    }

    var id = ++self.lid,
        first = options.first || false;
    uniContext[uni] = id;
    var e = {
      fn: fn,
      context: context,
      uniContext: uniContext,
      id: id,
      async: false,
      called: 0,
      // how many times the function was triggered
      limit: 0,
      // how many times the function is allowed to trigger
      start: 1,
      // from which attempt it is allowed to trigger the function
      count: 0,
      // how many attempts to trigger the function was made
      append: null,
      // append parameters
      prepend: null // prepend parameters

    };
    extend(e, options, true, false);

    if (e.async === true) {
      e.async = 1;
    }

    if (first) {
      self.listeners.unshift(e);
    } else {
      self.listeners.push(e);
    }

    self.map[id] = e;

    if (self.autoTrigger && self.lastTrigger && !self.suspended) {
      var prevFilter = self.triggerFilter;

      self.triggerFilter = function (l) {
        if (l.id === id) {
          return prevFilter ? prevFilter(l) !== false : true;
        }

        return false;
      };

      self.trigger.apply(self, self.lastTrigger);
      self.triggerFilter = prevFilter;
    }

    return id;
  },

  /**
   * @method
   * @param {function} fn Callback function { @required }
   * @param {object} context Function's "this" object
   * @param {object} options See {@link class:Observable.on}
   */
  once: function once(fn, context, options) {
    options = options || {};
    options.limit = 1;
    return this.on(fn, context, options);
  },

  /**
   * @method
   * @param {function} fn Callback function { @required }
   * @param {object} context Callback context
   */
  un: function un(fn, context) {
    var self = this,
        inx = -1,
        uni = self.uni,
        listeners = self.listeners,
        id;

    if (fn == parseInt(fn)) {
      id = parseInt(fn);
    } else {
      context = context || fn;
      id = context[uni];
    }

    if (!id) {
      return false;
    }

    for (var i = 0, len = listeners.length; i < len; i++) {
      if (listeners[i].id === id) {
        inx = i;
        delete listeners[i].uniContext[uni];
        break;
      }
    }

    if (inx === -1) {
      return false;
    }

    listeners.splice(inx, 1);
    delete self.map[id];
    return true;
  },

  /**
   * @method hasListener
   * @return bool
   */

  /**
   * @method
   * @param {function} fn Callback function { @required }
   * @param {object} context Callback context
   * @return boolean
   */
  hasListener: function hasListener(fn, context) {
    var self = this,
        listeners = self.listeners,
        id;

    if (fn) {
      context = context || fn;

      if (!isFunction(fn)) {
        id = parseInt(fn);
      } else {
        id = context[self.uni];
      }

      if (!id) {
        return false;
      }

      for (var i = 0, len = listeners.length; i < len; i++) {
        if (listeners[i].id === id) {
          return true;
        }
      }

      return false;
    } else {
      return listeners.length > 0;
    }
  },

  /**
   * @method
   */
  removeAllListeners: function removeAllListeners() {
    var self = this,
        listeners = self.listeners,
        uni = self.uni,
        i,
        len;

    for (i = 0, len = listeners.length; i < len; i++) {
      delete listeners[i].uniContext[uni];
    }

    self.listeners = [];
    self.map = {};
  },

  /**
   * @method
   */
  suspend: function suspend() {
    this.suspended = true;
  },

  /**
   * @method
   */
  resume: function resume() {
    this.suspended = false;
  },
  _prepareArgs: function _prepareArgs(l, triggerArgs) {
    var args;

    if (l.append || l.prepend) {
      args = slice.call(triggerArgs);

      if (l.prepend) {
        args = l.prepend.concat(args);
      }

      if (l.append) {
        args = args.concat(l.append);
      }
    } else {
      args = triggerArgs;
    }

    return args;
  },

  /**
   * @method
   * @return {*}
   */
  trigger: function trigger() {
    var self = this,
        listeners = self.listeners,
        rr = self.returnResult,
        filter = self.triggerFilter,
        filterContext = self.filterContext,
        expectPromises = self.expectPromises,
        results = [],
        prevPromise,
        resPromise,
        args,
        resolver;

    if (self.suspended) {
      return null;
    }

    if (self.autoTrigger) {
      self.lastTrigger = slice.call(arguments);
    }

    if (listeners.length === 0) {
      return null;
    }

    var ret = rr === "all" || rr === "concat" ? [] : rr === "merge" ? {} : null,
        q,
        l,
        res;

    if (rr === "first") {
      q = [listeners[0]];
    } else {
      // create a snapshot of listeners list
      q = slice.call(listeners);
    } // now if during triggering someone unsubscribes
    // we won't skip any listener due to shifted
    // index


    while (l = q.shift()) {
      // listener may already have unsubscribed
      if (!l || !self.map[l.id]) {
        continue;
      }

      args = self._prepareArgs(l, arguments);

      if (filter && filter.call(filterContext, l, args, self) === false) {
        continue;
      }

      if (l.filter && l.filter.apply(l.filterContext || l.context, args) === false) {
        continue;
      }

      l.count++;

      if (l.count < l.start) {
        continue;
      }

      if (l.async && !expectPromises) {
        res = null;
        async(l.fn, l.context, args, l.async);
      } else {
        if (expectPromises) {
          resolver = function (l, rr, args) {
            return function (value) {
              if (rr === "pipe") {
                args[0] = value;
                args = self._prepareArgs(l, args);
              }

              return l.fn.apply(l.context, args);
            };
          }(l, rr, slice.call(arguments));

          if (prevPromise) {
            res = prevPromise.then(resolver);
          } else {
            res = l.fn.apply(l.context, args);
          }

          res.catch(function (err) {
            console.log(err);
          });
        } else {
          res = l.fn.apply(l.context, args);
        }
      }

      l.called++;

      if (l.called === l.limit) {
        self.un(l.id);
      } // This rule is valid in all cases sync and async.
      // It either returns first value or first promise.


      if (rr === "first") {
        return res;
      } // Promise branch


      if (expectPromises) {
        // we collect all results for further processing/resolving
        results.push(res);

        if (rr === "pipe" && res) {
          prevPromise = res;
        }
      } else {
        if (rr !== null) {
          if (rr === "all") {
            ret.push(res);
          } else if (rr === "concat" && res) {
            ret = ret.concat(res);
          } else if (rr === "merge") {
            extend(ret, res, true, false);
          } else if (rr === "nonempty" && res) {
            return res;
          } else if (rr === "pipe") {
            ret = res;
            arguments[0] = res;
          } else if (rr === "last") {
            ret = res;
          } else if (rr === false && res === false) {
            return false;
          } else if (rr === true && res === true) {
            return true;
          }
        }
      }
    }

    if (expectPromises) {
      resPromise = Promise.all(results);

      if (self.resolvePromises && rr !== null && rr !== "all") {
        resPromise = resPromise.then(function (values) {
          var i,
              l = values.length,
              res;

          for (i = 0; i < l; i++) {
            res = values[i];

            if (rr === "concat" && res) {
              ret = ret.concat(res);
            } else if (rr === "merge") {
              extend(ret, res, true, false);
            } else if (rr === "nonempty" && res) {
              return res;
            } else if (rr === false && res === false) {
              return false;
            } else if (rr === true && res === true) {
              return true;
            }
          }

          return ret;
        });
      }

      return resPromise;
    } else return ret;
  }
}, true, false);
/**
 * @description A javascript event system implementing two patterns - observable and collector.
 * @description Observable:
 * @code examples/observable.js
 *
 * @description Collector:
 * @code examples/collector.js
 *
 * @class Observable
 * @version 1.2
 * @author Ivan Kuindzhi
 * @link https://github.com/kuindji/metaphorjs-observable
 */

var Observable = function Observable() {
  this.events = {};
};

extend(Observable.prototype, {
  /**
  * You don't have to call this function unless you want to pass params other than event name.
  * Normally, events are created automatically.
  *
  * @method createEvent
  * @access public
  * @param {string} name {
  *       Event name
  *       @required
  * }
  * @param {bool|string} returnResult {
  *   false -- return first 'false' result and stop calling listeners after that<br>
  *   true -- return first 'true' result and stop calling listeners after that<br>
  *   "all" -- return all results as array<br>
  *   "concat" -- merge all results into one array (each result must be array)<br>
  *   "merge" -- merge all results into one object (each result much be object)<br>
  *   "pipe" -- pass return value of previous listener to the next listener.
  *             Only first trigger parameter is being replaced with return value,
  *             others stay as is.<br>
  *   "first" -- return result of the first handler (next listener will not be called)<br>
  *   "nonempty" -- return first nonempty result<br>
  *   "last" -- return result of the last handler (all listeners will be called)<br>
  * }
  * @param {bool} autoTrigger {
  *   once triggered, all future subscribers will be automatically called
  *   with last trigger params
  *   @code examples/autoTrigger.js
  * }
  * @param {function} triggerFilter {
  *   This function will be called each time event is triggered. Return false to skip listener.
  *   @code examples/triggerFilter.js
  *   @param {object} listener This object contains all information about the listener, including
  *       all data you provided in options while subscribing to the event.
  *   @param {[]} arguments
  *   @return {bool}
  * }
  * @param {object} filterContext triggerFilter's context
  * @return {ObservableEvent}
  */

  /**
   * @method createEvent
   * @param {string} name
   * @param {object} options {
   *  Options object or returnResult value. All options are optional.
   *  @type {string|bool} returnResult
   *  @type {bool} autoTrigger
   *  @type {function} triggerFilter
   *  @type {object} filterContext
   *  @type {bool} expectPromises
   *  @type {bool} resolvePromises
   * }
   * @returns {ObservableEvent}
   */
  createEvent: function createEvent(name, options) {
    name = name.toLowerCase();
    var events = this.events;

    if (!events[name]) {
      events[name] = new ObservableEvent(name, options);
    }

    return events[name];
  },

  /**
  * @method
  * @access public
  * @param {string} name Event name
  * @return {ObservableEvent|undefined}
  */
  getEvent: function getEvent(name) {
    name = name.toLowerCase();
    return this.events[name];
  },

  /**
  * Subscribe to an event or register collector function.
  * @method
  * @access public
  * @param {string} name {
  *       Event name. Use '*' to subscribe to all events.
  *       @required
  * }
  * @param {function} fn {
  *       Callback function
  *       @required
  * }
  * @param {object} context "this" object for the callback function
  * @param {object} options {
  *       You can pass any key-value pairs in this object. All of them will be passed 
  *       to triggerFilter (if you're using one).
  *       @type {bool} first {
  *           True to prepend to the list of handlers
  *           @default false
  *       }
  *       @type {number} limit {
  *           Call handler this number of times; 0 for unlimited
  *           @default 0
  *       }
  *       @type {number} start {
  *           Start calling handler after this number of calls. Starts from 1
  *           @default 1
  *       }
      *      @type {[]} append Append parameters
      *      @type {[]} prepend Prepend parameters
      *      @type {bool} allowDupes allow the same handler twice
      *      @type {bool|int} async run event asynchronously. If event was
      *                      created with <code>expectPromises: true</code>, 
      *                      this option is ignored.
  * }
  */
  on: function on(name, fn, context, options) {
    name = name.toLowerCase();
    var events = this.events;

    if (!events[name]) {
      events[name] = new ObservableEvent(name);
    }

    return events[name].on(fn, context, options);
  },

  /**
  * Same as {@link class:Observable.on}, but options.limit is forcefully set to 1.
  * @method
  * @access public
  */
  once: function once(name, fn, context, options) {
    options = options || {};
    options.limit = 1;
    return this.on(name, fn, context, options);
  },

  /**
  * Unsubscribe from an event
  * @method
  * @access public
  * @param {string} name Event name
  * @param {function} fn Event handler
  * @param {object} context If you called on() with context you must 
  *                         call un() with the same context
  */
  un: function un(name, fn, context) {
    name = name.toLowerCase();
    var events = this.events;

    if (!events[name]) {
      return;
    }

    events[name].un(fn, context);
  },

  /**
   * Relay all events of <code>eventSource</code> through this observable.
   * @method
   * @access public
   * @param {object} eventSource
   * @param {string} eventName
   */
  relayEvent: function relayEvent(eventSource, eventName) {
    eventSource.on(eventName, this.trigger, this, {
      prepend: eventName === "*" ? null : [eventName]
    });
  },

  /**
   * Stop relaying events of <code>eventSource</code>
   * @method
   * @access public
   * @param {object} eventSource
   * @param {string} eventName
   */
  unrelayEvent: function unrelayEvent(eventSource, eventName) {
    eventSource.un(eventName, this.trigger, this);
  },

  /**
   * @method hasListener
   * @access public
   * @return bool
   */

  /**
  * @method hasListener
  * @access public
  * @param {string} name Event name { @required }
  * @return bool
  */

  /**
  * @method
  * @access public
  * @param {string} name Event name { @required }
  * @param {function} fn Callback function { @required }
  * @param {object} context Function's "this" object
  * @return bool
  */
  hasListener: function hasListener(name, fn, context) {
    var events = this.events;

    if (name) {
      name = name.toLowerCase();

      if (!events[name]) {
        return false;
      }

      return fn ? events[name].hasListener(fn, context) : true;
    } else {
      for (name in events) {
        if (events[name].hasListener()) {
          return true;
        }
      }

      return false;
    }
  },

  /**
  * @method
  * @access public
  * @param {string} name Event name { @required }
  * @return bool
  */
  hasEvent: function hasEvent(name) {
    return !!this.events[name];
  },

  /**
  * Remove all listeners from all events
  * @method removeAllListeners
  * @access public
  */

  /**
  * Remove all listeners from specific event
  * @method
  * @access public
  * @param {string} name Event name { @required }
  */
  removeAllListeners: function removeAllListeners(name) {
    var events = this.events;

    if (name) {
      if (!events[name]) {
        return;
      }

      events[name].removeAllListeners();
    } else {
      for (name in events) {
        events[name].removeAllListeners();
      }
    }
  },

  /**
  * Trigger an event -- call all listeners. Also triggers '*' event.
  * @method
  * @access public
  * @param {string} name Event name { @required }
  * @param {*} ... As many other params as needed
  * @return mixed
  */
  trigger: function trigger() {
    var name = arguments[0],
        events = this.events,
        e,
        res = null;
    name = name.toLowerCase();

    if (events[name]) {
      e = events[name];
      res = e.trigger.apply(e, slice.call(arguments, 1));
    } // trigger * event with current event name
    // as first argument


    if (e = events["*"]) {
      e.trigger.apply(e, arguments);
    }

    return res;
  },

  /**
  * Suspend an event. Suspended event will not call any listeners on trigger().
  * @method
  * @access public
  * @param {string} name Event name
  */
  suspendEvent: function suspendEvent(name) {
    name = name.toLowerCase();
    var events = this.events;

    if (!events[name]) {
      return;
    }

    events[name].suspend();
  },

  /**
  * @method
  * @access public
  */
  suspendAllEvents: function suspendAllEvents() {
    var events = this.events;

    for (var name in events) {
      events[name].suspend();
    }
  },

  /**
  * Resume suspended event.
  * @method
  * @access public
  * @param {string} name Event name
  */
  resumeEvent: function resumeEvent(name) {
    name = name.toLowerCase();
    var events = this.events;

    if (!events[name]) {
      return;
    }

    events[name].resume();
  },

  /**
  * @method
  * @access public
  */
  resumeAllEvents: function resumeAllEvents() {
    var events = this.events;

    for (var name in events) {
      events[name].resume();
    }
  },

  /**
   * @method
   * @access public
   * @param {string} name Event name
   */
  destroyEvent: function destroyEvent(name) {
    var events = this.events;

    if (events[name]) {
      events[name].removeAllListeners();
      events[name].destroy();
      delete events[name];
    }
  },

  /**
  * Destroy observable
  * @method
  * @md-not-inheritable
  * @access public
  */
  destroy: function destroy() {
    var self = this,
        events = self.events;

    for (var i in events) {
      self.destroyEvent(i);
    }

    for (i in self) {
      self[i] = null;
    }
  },

  /**
  * Although all methods are public there is getApi() method that allows you
  * extending your own objects without overriding "destroy" (which you probably have)
  * @code examples/api.js
  * @method
  * @md-not-inheritable
  * @returns object
  */
  getApi: function getApi() {
    var self = this;

    if (!self.api) {
      var methods = ["createEvent", "getEvent", "on", "un", "once", "hasListener", "removeAllListeners", "trigger", "suspendEvent", "suspendAllEvents", "resumeEvent", "resumeAllEvents", "destroyEvent", "relayEvent", "unrelayEvent"],
          api = {},
          name;

      for (var i = -1, l = methods.length; ++i < l; name = methods[i], api[name] = bind(self[name], self)) {}

      self.api = api;
    }

    return self.api;
  }
}, true, false);
/**
 * @mixin Observable
 * @description Mixin adds observable features to the host object.
 *              It adds 'callback' option to the host config. See $beforeInit.
 *              Mixin is designed for MetaphorJs class system.
 * @code examples/mixin.js
 */

ns.register("mixin.Observable", {
  /**
   * @private
   * @type {Observable}
   * @description You can use this instance in your $init function
   */
  $$observable: null,

  /**
   * @private
   * @type {object}
   */
  $$callbackContext: null,

  /**
   * @protected
   * @type {object} {
   *      Override this to define event properties. 
   *      Object's key is event name, value - either returnResult or 
   *      options object. See {@link class:Observable.createEvent}
   * }
   */
  $$events: null,

  /**
   * @method
   * @private
   * @param {object} cfg {
   *      This is a config that was passed to the host object's constructor.
   *      It is being passed to mixin's $beforeInit automatically.
   *      @type {object} callback {
   *          Here, except for 'context', '$context' and 'scope', 
   *          keys are event names and values are listeners. 
   *          @type {object} context All given listeners context
   *          @type {object} scope The same
   *      }
   * }
   */
  $beforeInit: function $beforeInit(cfg) {
    var self = this;
    self.$$observable = new Observable();
    self.$initObservable(cfg);
  },

  /**
   * @method
   * @private
   * @ignore
   * @param {object} cfg
   */
  $initObservable: function $initObservable(cfg) {
    var self = this,
        obs = self.$$observable,
        i;

    if (cfg && cfg.callback) {
      var ls = cfg.callback,
          context = ls.context || ls.scope || ls.$context,
          events = extend({}, self.$$events, ls.$events, true, false);

      for (i in events) {
        obs.createEvent(i, events[i]);
      }

      ls.context = null;
      ls.scope = null;

      for (i in ls) {
        if (ls[i]) {
          obs.on(i, ls[i], context || self);
        }
      }

      cfg.callback = null;

      if (context) {
        self.$$callbackContext = context;
      }
    } else if (self.$$events) {
      for (i in self.$$events) {
        obs.createEvent(i, self.$$events[i]);
      }
    }
  },

  /**
   * @method
   * @see {@link class:Observable.on}
   */
  on: function on() {
    var o = this.$$observable;
    return o ? o.on.apply(o, arguments) : null;
  },

  /**
   * @method
   * @see {@link class:Observable.un}
   */
  un: function un() {
    var o = this.$$observable;
    return o ? o.un.apply(o, arguments) : null;
  },

  /**
   * @method
   * @see {@link class:Observable.once}
   */
  once: function once() {
    var o = this.$$observable;
    return o ? o.once.apply(o, arguments) : null;
  },

  /**
   * @method
   * @see {@link class:Observable.trigger}
   */
  trigger: function trigger() {
    var o = this.$$observable;
    return o ? o.trigger.apply(o, arguments) : null;
  },

  /**
   * @method
   * @private
   * @ignore
   */
  $beforeDestroy: function $beforeDestroy() {
    this.$$observable.trigger("before-destroy", this);
  },

  /**
   * @method
   * @private
   * @ignore
   */
  $afterDestroy: function $afterDestroy() {
    var self = this;
    self.$$observable.trigger("destroy", self);
    self.$$observable.destroy();
    self.$$observable = null;
  }
});
var Base = defineClass({
  $class: "Base",
  $mixins: ["mixin.Observable"],
  $init: function $init(options) {
    this.options = {};

    if (options) {
      this.setOptions(options);
    }
  },

  /**
   * Get option value
   * @method
   * @param {string} name
   * @param {*} defValue
   * @returns {*|null}
   */
  getOption: function getOption(name, defValue) {
    return this.options[name] || defValue || null;
  },

  /**
   * Get all options
   * @method
   * @returns {object}
   */
  getOptions: function getOptions() {
    return copy(this.options);
  },

  /**
   * Set options
   * @method
   * @param {object} opts
   */
  setOptions: function setOptions(opts) {
    if (opts) {
      for (var key in opts) {
        this.setOption(key, opts[key]);
      }
    }
  },

  /**
   * Set option
   * @method
   * @param {string} name
   * @param {*} value
   */
  setOption: function setOption(name, value) {
    if (this.$$observable.hasEvent("set_" + name)) {
      this.trigger("set_" + name, value, this, name);
    } else {
      this.options[name] = value;
    }
  },
  _setArrayOption: function _setArrayOption(value, self, name) {
    var curr = this.getOption(name);

    if (!isArray(value)) {
      value = [value];
    }

    if (curr === null) {
      curr = [];
    }

    value.forEach(function (v) {
      if (curr.indexOf(v) === -1) {
        curr.push(v);
      }
    });
    this.options[name] = curr;
  }
});

var isDir = function isDir(dirPath) {
  return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
};
/**
 * Resolve path or file pattern to an asbolute path or file pattern
 * @function
 * @param {string} toResolve 
 * @param {array} locations 
 * @param {string} resolveDir 
 */


var resolvePath = function resolvePath(toResolve, locations, resolveDir) {
  if (!toResolve) {
    return null;
  }

  locations = locations || [];

  if (process.env.METAPHORJS_PATH) {
    locations.push(process.env.METAPHORJS_PATH);
  }

  if (process.env.NODE_PATH) {
    locations = locations.concat(process.env.NODE_PATH.split(path.delimiter));
  }

  try {
    var resolved = require.resolve(toResolve, {
      paths: locations
    });

    if (resolved) {
      return resolved;
    }
  } catch (thrown) {}

  var norm = toResolve,
      inx,
      i,
      l,
      loc,
      dirMode = !!resolveDir,
      abs = norm.substr(0, 1) === "/";

  while ((inx = norm.indexOf('*')) !== -1) {
    norm = norm.substr(0, inx);
    norm = norm.split('/');
    norm.pop();
    norm = norm.join("/");
    dirMode = true;
  }

  if (abs) {
    if (fs.existsSync(norm)) {
      if (dirMode || !isDir(norm)) {
        return path.normalize(norm) + toResolve.replace(norm, "");
      }
    }
  }

  for (i = 0, l = locations.length; i < l; i++) {
    loc = locations[i];

    if (loc.substr(loc.length - 1) !== '/') {
      loc += '/';
    }

    if (fs.existsSync(loc + norm)) {
      if (dirMode || !isDir(loc + norm)) {
        return path.normalize(loc + norm) + toResolve.replace(norm, "");
      }
    }
  }
  /*try {
      return require.resolve(toResolve);
  }
  catch (thrown) {}*/


  return null;
};
/**
 * @class Import
 */


var Import = Base.$extend({
  $class: "Import",
  id: null,
  type: null,
  module: null,
  file: null,
  sub: null,
  in: null,
  names: null,
  // import as
  fromMap: null,
  skip: false,

  /**
   * @constructor
   * @param {object} cfg {
   *  @type {string} type
   *  @type {string} module
   *  @type {File} file
   *  @type {string} sub
   *  @type {array} names
   *  @type {File} in In which file import happens
   * }
   */
  $init: function $init(cfg) {
    this.names = [];
    this.fromMap = {};
    this.id = nextUid();
    extend(this, cfg, true, false);
  },

  /**
   * Create copy of this import
   * @method
   */
  createCopy: function createCopy() {
    var self = this;
    return new self.$self({
      type: self.type,
      module: self.module,
      file: self.file,
      sub: self.sub,
      names: self.names.slice(),
      in: self.in.slice(),
      fromMap: extend({}, self.fromMap)
    });
  },

  /**
   * Is this the same or similar import
   * @method
   * @param {object|Import} def {
   *  @type {string} module
   *  @type {string} sub
   *  @type {File} file
   * }
   */
  is: function is(def) {
    if (def.file && this.file && this.file.id === def.file.id) {
      return true;
    }

    if (def.module && def.module === this.module && def.sub == this.sub) {
      return true;
    }

    return false;
  },

  /**
   * Is this import skipped
   * @method
   * @returns {bool}
   */
  isSkipped: function isSkipped() {
    return this.skip;
  },

  /**
   * Set this file skipped
   * @method
   * @param {bool} state
   */
  setSkipped: function setSkipped(state) {
    this.skip = state;
  },

  /**
   * Is this a module import
   * @method
   * @returns {bool}
   */
  isModule: function isModule() {
    return this.module !== null;
  },

  /**
   * Is this a file import
   * @method
   * @returns {bool}
   */
  isFile: function isFile() {
    return this.file !== null;
  },

  /**
   * Add names to which import is assigned
   * @method
   * @param {array} names
   */
  addNames: function addNames(names) {
    names.forEach(this.addName, this);
  },

  /**
   * Add files in which import happens
   * @method
   * @param {array} in
   */
  addIn: function addIn(parents) {
    var self = this;
    parents.forEach(function (parent) {
      if (self.in.indexOf(parent) === -1) {
        self.in.push(parent);
      }
    });
  },

  /**
   * Add name to which import is assigned
   * @method
   * @param {string} name
   */
  addName: function addName(name) {
    if (this.names.indexOf(name) === -1) {
      this.names.push(name);
    }
  },

  /**
   * Has assigned name
   * @method
   * @param {string} name
   * @returns {bool}
   */
  hasName: function hasName(name) {
    return this.names.indexOf(name) !== -1;
  },

  /**
   * Remove assigned name
   * @method
   * @param {string} name
   */
  removeName: function removeName(name) {
    var inx = this.names.indexOf(name);

    if (inx !== -1) {
      this.names.splice(inx, 1);
    }
  },

  /**
   * Set name map. When one of the import names
   * is overlapping with another import,
   * we wrap parent file and assign 
   * 
   */
  setNameFrom: function setNameFrom(name, from) {
    this.fromMap[name] = from;
  },

  /**
   * Get import code
   * @method
   * @returns {string}
   */
  getCode: function getCode() {
    return "require(\"" + this.module + "\");";
  },

  /**
   * @ignore
   */
  toString: function toString() {
    return this.getCode();
  }
});
Base.$extend({
  $class: "plugin.file.NodeModule",
  host: null,
  $init: function $init(host) {
    this.host = host;
  },
  $afterHostInit: function $afterHostInit() {
    var self = this;
    self.host.on("collect-file-info", self.collectFileInfo, self);
  },
  collectFileInfo: function collectFileInfo(file) {
    if (file.path.indexOf("/node_modules/") !== -1) {
      var parts = file.path.split("/node_modules/"),
          moduleName = parts[1].split("/")[0],
          pkg = parts[0] + "/node_modules/" + moduleName + "/package.json",
          pkgJson = JSON.parse(fs.readFileSync(pkg));
      return {
        npm: {
          module: moduleName,
          version: pkgJson.version
        }
      };
    }
  }
});
Base.$extend({
  $class: "plugin.code.Cleanup",
  host: null,
  $init: function $init(host) {
    this.host = host;
  },
  $afterHostInit: function $afterHostInit() {
    this.host.on("cleanup-code", this.cleanupCode, this);
  },
  cleanupCode: function cleanupCode(content) {
    var rEmptyVar = /var[\s|,]*;/g,
        rTrailComma = /,\s*;/g,
        rStrict = new RegExp("'use " + "strict'|" + '"use ' + 'strict";?', "g"),
        rVarSpace = /var\s+/g;
    content = content.replace(rStrict, "");
    content = content.replace(rVarSpace, "var ");
    content = content.replace(rEmptyVar, "");
    content = content.replace(rTrailComma, ";");
    return content;
  }
});
/**
 * @plugin plugin.file.CodeInfo
 */

Base.$extend({
  $class: "plugin.code.Info",
  host: null,
  $init: function $init(host) {
    this.host = host;
  },
  $afterHostInit: function $afterHostInit() {
    var self = this;
    self.host.on("collect-code-info", self.onCollectCodeInfo, self);
    self.host.on("collect-imports", self.getFileReqs, self);
    self.host.on("decide-wrapping", self.needsWrapping, self);
    self.host.on("decide-module-exports", self.whatToDoWithEs5Export, self);
  },
  onCollectCodeInfo: function onCollectCodeInfo(code) {
    var estree = esprima.parseModule(code),
        body = estree.body,
        stats = {
      "module.exports": null,
      "wrappedFuncCall": 0,
      "rootFuncCall": 0,
      "total": 0,
      "firstIdentifier": null,
      "firstIdType": null,
      "firstIdExpression": 0,
      "declarations": 0,
      "statements": 0,
      "expressions": 0,
      "exportsAnonymous": false,
      "exportsFirstId": false
    },
        typeReg = /(statement|declaration|expression)$/i,
        i,
        l,
        entry,
        j,
        jl,
        type,
        decl,
        match,
        statType;

    for (i = 0, l = body.length; i < l; i++) {
      entry = body[i];
      type = entry.type; // first var/func/class declaration

      if (!stats.firstIdentifier) {
        if (type == "VariableDeclaration") {
          for (j = 0, jl = entry.declarations.length; j < jl; j++) {
            decl = entry.declarations[j];

            if (decl.id && decl.id.type == "Identifier") {
              stats.firstIdentifier = decl.id.name;
              stats.firstIdType = "variable";
              break;
            }
          }
        } else if (type == "FunctionDeclaration" || type == "ClassDeclaration") {
          if (entry.id && entry.id.type == "Identifier") {
            stats.firstIdentifier = entry.id.name;
            stats.firstIdType = type.replace("Declaraion").toLowerCase();
          }
        }
      } // top level wrapper func


      if (type == "ExpressionStatement" && entry.expression.type == "CallExpression" && entry.expression.callee.type == "FunctionExpression") {
        if (entry.expression.callee.id == null) {
          stats.wrappedFuncCall++;
        } else {
          stats.rootFuncCall++;
        }
      } // saving module.exports expression


      if (type == "ExpressionStatement" && entry.expression.type == "AssignmentExpression" && entry.expression.left.type == "MemberExpression") {
        if (entry.expression.left.object.name == "module" && entry.expression.left.property.name == "exports") {
          stats['module.exports'] = true; //entry.expression.right;

          var right = entry.expression.right;

          if (right.type == "FunctionExpression") {
            if (right.id === null) {
              stats.exportsAnonymous = true;
            } else if (!stats.firstIdentifier && right.id.name) {
              stats.firstIdentifier = right.id.name;
            }
          } else if (right.type == "Identifier" && right.name == stats.firstIdentifier) {
            stats.exportsFirstId = true;
          } // do not count this one


          continue;
        }

        if (entry.expression.left.object.name == stats.firstIdentifier) {
          stats.firstIdExpression++;
        }
      } // variable declarations can have multiple per entry


      if (type == "VariableDeclaration") {
        stats.declarations += entry.declarations.length;
        stats.total++;
      } // others have one
      else {
          match = type.match(typeReg);

          if (match) {
            statType = match[0].toLowerCase() + "s";
            stats[statType]++;
            stats.total++;
          }
        }
    }

    return stats;
  },

  /**
   * Get a list of module dependencies
   * @method
   * @param {string} content
   * @returns {array} {
   *  @type {string} type 'require' | 'import'
   *  @type {array} names 
   *  @type {string} module Module name or file path
   *  @type {string} sub <code>require("a").b.c</code> would be <code>.b.c</code>
   *  @type {array} range [start, end] index positions
   * }
   */
  getFileReqs: function getFileReqs(content) {
    var data = esprima.parseModule(content, {
      range: true
    }),
        reqs = [];

    var add = function add(name, mod, subprop, range) {
      reqs.push({
        type: "require",
        names: name ? [name] : [],
        module: mod,
        sub: subprop,
        range: range
      });
    };

    var isMemberExpressionOfRequire = function isMemberExpressionOfRequire(obj) {
      if (obj.object && obj.object.type == "CallExpression" && obj.object.callee.name == "require") {
        return {
          mod: obj.object.arguments[0].value,
          subNames: [obj.property.name]
        };
      }

      if (obj.object && obj.object.type == "MemberExpression") {
        var res = isMemberExpressionOfRequire(obj.object);

        if (res !== false) {
          res.subNames.unshift(obj.property.name);
          return res;
        }
      }

      return false;
    };

    data.body.forEach(function (entry) {
      if (entry.type == "VariableDeclaration") {
        entry.declarations.forEach(function (decl) {
          if (!decl.id || decl.id.type != "Identifier") {
            return;
          }

          if (decl.init && decl.init.type == "CallExpression" && decl.init.callee.name == "require") {
            add(decl.id.name, decl.init.arguments[0].value, null, decl.range);
          }

          var res;

          if (decl.init && decl.init.type == "MemberExpression" && (res = isMemberExpressionOfRequire(decl.init)) !== false) {
            add(decl.id.name, res.mod, "." + res.subNames.join("."), decl.range);
          }
        });
      }

      if (entry.type == "ExpressionStatement" && entry.expression.type == "CallExpression" && entry.expression.callee.name == "require") {
        add(null, entry.expression.arguments[0].value, null, entry.range);
      }
    });
    return reqs;
  },

  /**
   * Does this file needs a var name in global space
   * @method
   * @returns {bool}
   */
  hasAliases: function hasAliases() {
    var file = this.host,
        as = file.getOption("as");
    return as && as.length > 0;
  },

  /**
   * Does this module needs wrapping
   * @method
   * @param {object} codeInfo
   * @param {File} file
   * @returns {bool}
   */
  needsWrapping: function needsWrapping(file) {
    var codeInfo = file.getCodeInfo(); //console.log(file.path)
    //console.log(JSON.stringify(codeInfo))
    // more than one declaration (class/var/func)

    if (codeInfo.declarations > 1) {
      return true;
    } // at least one top-level statement for/while/if/etc


    if (codeInfo.expressions > 0) {
      return true;
    } // at least one expression except wrapped func calls
    // and module exports


    if (codeInfo.statements - codeInfo.wrappedFuncCall - codeInfo.rootFuncCall - codeInfo.firstIdExpression - (codeInfo['module.exports'] ? 1 : 0) > 0) {
      return true;
    } // if there is only one declaration and it is being exported
    // then this module doesn't need wrapping.


    if (codeInfo.declarations === 1) {
      if (codeInfo['module.exports']) {
        if (codeInfo['module.exports'].type == "Identifier") {
          return codeInfo['module.exports'].name != codeInfo.firstIdentifier;
        }
      } // otherwise, it does need wrapping
      //return true;

    }

    return false;
  },
  whatToDoWithEs5Export: function whatToDoWithEs5Export(file) {
    var info = file.getCodeInfo(),
        as = file.getOption("as");

    if (file.needsWrapping()) {
      return {
        return: true
      };
    } else {
      if (info.exportsFirstId) {
        return {
          removeAll: true
        };
      } else if (info.exportsAnonymous) {
        return {
          varName: file.getUniqueName()
        };
      } else if (!info.firstIdentifier && as) {
        return {
          varName: file.getUniqueName()
        };
      }
      /*else if (info.exportsAnonymous || !info.firstIdentifier) {
          return {varName: file.getUniqueName()};
      }*/

    }

    return null;
  }
});
Base.$extend({
  $class: "plugin.code.Generator",
  host: null,
  $init: function $init(host) {
    this.host = host;
  },
  $afterHostInit: function $afterHostInit() {
    var self = this,
        host = this.host;
    host.$$observable.createEvent("code-wrap", "pipe");
    host.$$observable.createEvent("code-replace-export", "pipe");
    host.$$observable.createEvent("code-prepend-var", "pipe");
    host.$$observable.createEvent("code-return", "pipe");
    host.$$observable.createEvent("code-expose", "pipe");
    host.$$observable.createEvent("code-module-imports", "concat");
    host.$$observable.createEvent("code-wrapped-imports", "concat");
    host.$$observable.createEvent("code-export", "first");
    host.$$observable.createEvent("code-global", "first");
    host.$$observable.createEvent("code-amd-module", "first");
    host.on("code-wrap", self.wrap, self);
    host.on("code-replace-export", self.replaceEs5Export, self);
    host.on("code-replace-export", self.replaceEs6Export, self);
    host.on("code-prepend-var", self.prependVar, self);
    host.on("code-return", self.returnVar, self);
    host.on("code-expose", self.exposeVars, self);
    host.on("code-module-imports", self.moduleImports, self);
    host.on("code-wrapped-imports", self.wrappedImports, self);
    host.on("code-export", self.export, self);
    host.on("code-global", self.exposeGlobal, self);
    host.on("code-amd-module", self.amdModule, self);
  },
  wrap: function wrap(code) {
    return "(function(){\n" + code + "\n}());";
  },
  replaceEs5Export: function replaceEs5Export(code, action) {
    var repl = "";

    if (action) {
      if (action.varName) {
        repl = "var " + action.varName + " = ";
      } else if (action.return) {
        repl = "return ";
      } else if (action.removeAll) {
        return code.replace(/module\s*\.exports\s*=\s*[^\s]+\s*;?/, "");
      }
    }

    return code.replace(/module\s*\.exports\s*=\s*/, repl);
  },
  replaceEs6Export: function replaceEs6Export(code, withWhat) {
    return code;
  },
  returnVar: function returnVar(code, varName) {
    if (varName) {
      return code + "\n\nreturn " + varName + ";\n";
    }

    return code;
  },
  prependVar: function prependVar(code, varName) {
    return "var " + varName + " = " + code;
  },
  moduleImports: function moduleImports() {
    var self = this,
        bundle = self.host,
        code = "\nvar ",
        all = [];
    bundle.getImports("module").forEach(function (imp) {
      all = all.concat(imp.names);
    });

    if (all.length) {
      code += all.join(", ") + ";\n";
      code += bundle.getImports("module").map(function (imp) {
        return imp.names.join(" = ") + " = " + "require(\"" + imp.module + "\")" + (imp.sub || "");
      }).join(";\n") + ";\n";
      return [code];
    }

    return [""];
  },
  wrappedImports: function wrappedImports() {
    var self = this,
        file = self.host,
        code = [];
    file.getImports("file").forEach(function (imp) {
      for (var name in imp.fromMap) {
        var from = imp.fromMap[name];

        if (typeof from === "string") {
          from = [from];
        }

        code.push("var " + name + " = " + from.join(".") + ";");
      }
    });

    if (code.length) {
      code.unshift("\n");
    }

    return code;
  },
  exposeVars: function exposeVars(code, exposeIn, exposeList) {
    var exp = "\nlet " + exposeIn + " = {};\n";
    exposeList.forEach(function (name) {
      exp += exposeIn + "['" + name + "'] = " + name + ";\n";
    });
    return code + exp;
  },
  export: function _export(name) {
    if (name) {
      return "\nmodule.exports = " + name + ";\n";
    } else {
      return "\nmodule.exports = ";
    }
  },
  exposeGlobal: function exposeGlobal(name, exposeName) {
    return "\ntypeof global != \"undefined\" ? " + "(global['" + name + "'] = " + exposeName + ") : " + "(window['" + name + "'] = " + exposeName + ");\n";
  },
  amdModule: function amdModule(code, def, bundle) {
    var defName = def.name,
        defDeps = def.deps,
        defRet = def.return,
        start = 'define("' + defName + '", ',
        end = "\n});\n",
        deps = [],
        args = [],
        dep;

    if (defDeps) {
      for (dep in defDeps) {
        deps.push("'" + dep + "'");
        args.push(defDeps[dep]);
      }

      start += '[' + deps.join(", ") + '], ';
      start += 'function(' + args.join(", ") + ') {' + "\n";
    } else {
      start += "function() {\n";
    }

    if (defRet) {
      end = "\nreturn " + defRet + ";" + end;
    }

    return start + code + end + "\n";
  }
});
/**
 * @mixin mixin.WithImports
 */

ns.register("mixin.WithImports", {
  imports: null,
  importedBy: null,
  $beforeInit: function $beforeInit() {
    this.imports = [];
    this.importedBy = [];
  },
  $afterInit: function $afterInit() {
    var self = this;
    self.$$observable.createEvent("add-import", false);
    self.$$observable.createEvent("add-imported-by", false);
    self.on("add-import", function (def) {
      return !self.doesImport(def);
    });
    self.on("add-imported-by", function (def) {
      var imported = self.isImportedBy(def);

      if (imported) {
        imported.addNames(def.names);
        def.in && imported.addIn(def.in);
      }

      return !imported;
    });
  },

  /**
   * Does this file import another file or module
   * @method
   * @param {object} def import object
   * @returns Import|bool 
   */
  doesImport: function doesImport(def) {
    return !!this.imports.find(function (imp) {
      return imp.is(def);
    });
  },

  /**
   * Get import definition
   * @method
   * @param {Import|object} def
   * @returns {Import|null}
   */
  getImport: function getImport(def) {
    return this.imports.find(function (imp) {
      return imp.is(def);
    });
  },

  /**
   * Does this file import another file
   * @method
   * @param {File} file
   * @returns bool
   */
  doesImportFile: function doesImportFile(file) {
    return this.doesImport({
      file: file
    });
  },

  /**
   * Does this file import module
   * @method
   * @param {string} name
   * @param {string} sub
   * @returns bool
   */
  doesImportModule: function doesImportModule(name, sub) {
    return this.doesImport({
      module: name,
      sub: sub || null
    });
  },

  /**
   * Add import
   * @method
   * @param {Import} imp
   */
  addImport: function addImport(imp) {
    var self = this;

    if (self.trigger("add-import", imp, self) !== false) {
      self.imports.push(imp);
    }
  },

  /**
   * Is this file imported by another file
   * @method
   * @param {File} file 
   * @returns {bool|object}
   */
  isImportedBy: function isImportedBy(file) {
    return !!this.importedBy.find(function (imp) {
      return imp.file === file;
    });
  },

  /**
   * Get import definition of parent file
   * @method
   * @param {File} file
   * @returns {Import}
   */
  getImportedBy: function getImportedBy(file) {
    return this.importedBy.find(function (imp) {
      return imp.file === file;
    });
  },

  /**
   * Add link to parent file
   * @method
   * @param {Import} imp
   */
  addImportedBy: function addImportedBy(imp) {
    var self = this;

    if (self.trigger("add-imported-by", imp, self) !== false) {
      self.importedBy.push(imp);
    }
  },

  /**
   * Return all module imports
   * @method
   * @param {string|null} type
   * @param {bool} deep {
   *  @default false
   * }
   * @param {bool} copy {
   *  @default true
   * }
   * @returns {array}
   */
  getImports: function getImports(type, deep, copy) {
    var imports = [],
        self = this;

    if (typeof copy == "undefined") {
      copy = true;
    }

    var filter = function filter(imp) {
      if (!type || type === "module" && imp.module || type === "file" && imp.file) {
        imports.push(copy ? imp.createCopy() : imp);
      }
    };

    if (deep && self.buildList) {
      self.buildList.forEach(function (entry) {
        entry.getImports(type).forEach(filter);
      });
    }

    self.imports.forEach(filter);
    return imports;
  },

  /**
   * Return list of files that import this one
   * @method
   * @returns array
   */
  getParents: function getParents() {
    return this.importedBy.slice();
  }
});

var File = function () {
  var all = {};
  /**
   * @class File
   */

  var File = Base.$extend({
    $class: "File",
    $mixins: ["mixin.WithImports"],
    id: null,
    path: null,
    bundle: null,
    $constructor: function $constructor() {
      this.$plugins.push("plugin.file.NodeModule");
      this.$plugins.push("plugin.code.Cleanup");
      this.$plugins.push("plugin.code.Info");
      this.$plugins.push("plugin.code.Generator");
      this.$super(arguments);
    },

    /**
     * Use File.get instead of constructor
     * @constructor
     * @param {string} filePath
     * @param {object} options
     */
    $init: function $init(filePath, options) {
      var self = this;
      self.$$observable.createEvent("collect-imports", "concat");
      self.$$observable.createEvent("collect-file-info", "merge");
      self.$$observable.createEvent("collect-code-info", "merge");
      self.$$observable.createEvent("cleanup-code", "pipe");
      self.$$observable.createEvent("decide-wrapping", true);
      self.$$observable.createEvent("decide-module-exports", "merge");
      self.id = nextUid();
      self.path = filePath;
      self._processed = false;
      self.content = "";
      self.on("set_as", self._setArrayOption, self);
      self.on("set_as", self._setAsOption, self);
      self.$super(options);
    },

    /**
     * Set current bundle
     * @method
     * @param {Bundle} bundle
     */
    setBundle: function setBundle(bundle) {
      this.bundle = bundle;
    },

    /**
     * Get unique variable name for this file
     * @method
     * @returns {string}
     */
    getUniqueName: function getUniqueName() {
      var as = this.getOption("as"),
          name;

      if (as && as.length) {
        name = as[0];
      } else {
        name = path.basename(this.path, ".js");
      }

      if (this.bundle.hasGlobalVar(name) && this.bundle.getGlobalVarOrigin(name) != this.path) {
        return "f_" + this.id;
      }

      return name;
    },
    _setAsOption: function _setAsOption() {
      if (this.options.as) {
        var i,
            l = this.options.as.length;

        for (i = 0; i < l; i++) {
          if (this.options.as[i] === "*") {
            this.options.as[i] = path.basename(this.path, ".js");
          }
        }
      }
    },

    /**
     * Process all global imports in the file
     * @method
     */
    processReqs: function processReqs() {
      var self = this;

      if (self._processed) {
        return;
      }

      self.content = self.getOriginalContent();
      self._processed = true;
      var reqs = self.trigger("collect-imports", self.content, self);
      reqs.forEach(self._processReq, self); // remove reqs from the code using ranges

      reqs.sort(function (a, b) {
        return b.range[1] - a.range[1];
      }).forEach(function (r) {
        self.content = self.content.slice(0, r.range[0]) + self.content.slice(r.range[1]);
      });
      self.content = self.trigger("cleanup-code", self.content);
    },
    _processReq: function _processReq(req) {
      var self = this,
          names = (req.names || []).slice(),
          reqPath = req.module,
          resPath;

      if (typeof names === "string") {
        names = [names];
      } // module import


      if (reqPath.indexOf("./") !== 0 && reqPath.indexOf("../") !== 0 && reqPath.indexOf("*") === -1 && reqPath.indexOf("/") === -1 && !reqPath.match(/\.js$/)) {
        self.addImport(new Import({
          type: "require",
          module: req.module,
          sub: req.sub,
          names: names,
          in: [self]
        }));
        return;
      } // file import
      else {
          resPath = resolvePath(reqPath, [path.dirname(self.path)]);

          if (!resPath) {
            throw reqPath + " required in " + self.path + " does not exist";
          }

          reqFile = File.get(resPath);
          self.addImport(new Import({
            type: "require",
            file: reqFile,
            names: names,
            in: [self]
          }));
          reqFile.addImportedBy(new Import({
            type: "require",
            file: self,
            names: names
          }));
        }
    },

    /**
     * Collect file info from all plugins
     * @method
     * @returns {object}
     */
    getFileInfo: function getFileInfo() {
      if (!this._fileInfo) {
        this._fileInfo = this.trigger("collect-file-info", this);
      }

      return this._fileInfo;
    },

    /**
     * Collect code info from all plugins
     * @method
     * @returns {object}
     */
    getCodeInfo: function getCodeInfo() {
      if (!this._codeInfo) {
        this._codeInfo = this.trigger("collect-code-info", this.content || this.getOriginalContent());
      }

      return this._codeInfo;
    },

    /**
     * Get file content stripped of requires and with all options applied
     * @method
     * @returns {string}
     */
    getContent: function getContent() {
      var self = this,
          name = self.getUniqueName(),
          code = self.content;
      code = self.trigger("cleanup-code", code);
      code = self.trigger("code-wrapped-imports", self).join("\n") + code;

      if (self.needsWrapping()) {
        code = self.trigger("code-wrap", code);
        code = self.trigger("code-prepend-var", code, name);
      }

      code = self.trigger("code-replace-export", code, self.trigger('decide-module-exports', self));
      return self.content = code;
    },

    /**
     * Get current state of the code
     * @method
     * @returns {string}
     */
    getCurrentContent: function getCurrentContent() {
      return this.content;
    },

    /**
     * Get original file content
     * @method
     * @returns {string}
     */
    getOriginalContent: function getOriginalContent() {
      return fs.readFileSync(this.path).toString();
    },

    /**
     * Checks if this file can't be included to global scope
     * without wrapping it first
     * @method
     * @returns {bool}
     */
    needsWrapping: function needsWrapping() {
      return this.getOption("wrap") || this.trigger("decide-wrapping", this) || false;
    },

    /**
     * @ignore
     */
    toString: function toString() {
      return this.getContent();
    }
  }, {
    /**
     * Singleton method. Use instead of constructor.
     * @static
     * @method
     * @param {string} filePath 
     * @param {object} options 
     */
    get: function get(filePath, options) {
      if (!all[filePath]) {
        all[filePath] = new File(filePath, options);
      } else {
        if (options) {
          var f = all[filePath];

          for (var key in options) {
            if (f.getOption(key) !== null) {
              f.setOption(key, options[key]);
            }
          }
        }
      }

      return all[filePath];
    }
  });
  return File;
}();

Base.$extend({
  $class: "plugin.bundle.FileProcessor",
  host: null,
  $constructor: function $constructor() {
    this.$super(arguments);
  },
  $init: function $init(host) {
    this.host = host;
    this.bsStack = [];
  },
  $afterHostInit: function $afterHostInit() {
    var self = this;
    self.host.on("process-file", self.processFileReqs, self);
    self.host.on("process-file", self.replaceFile, self);
    self.host.on("process-file", self.omitFile, self);
  },
  processFileReqs: function processFileReqs(file, bundle) {
    if (file && file instanceof File) {
      var self = this;
      self.bsStack.push(file.path);

      if (self.bsStack.length > 50) {
        console.log(self.bsStack);
        throw "Recursive requirement";
      }

      file.processReqs();
      file.getImports().forEach(function (imp) {
        if (imp.isFile()) {
          bundle.addFile(imp.file);
        }

        var code = file.getCurrentContent();
        imp.names.forEach(function (name) {
          var reg = new RegExp('[^a-zA-Z0-9]' + name + '[^a-zA-Z0-9]');

          if (!code.match(reg)) {
            console.log("Unused requirement " + name + " in " + file.path);
          }
        });
      });
      self.bsStack.pop();
    }

    return file;
  },
  replaceFile: function replaceFile(file, bundle) {
    if (file && file instanceof File) {
      var replace = bundle.allReplaces;

      while (replace[file.path]) {
        file = File.get(replace[file.path]);
      }
    }

    return file;
  },
  omitFile: function omitFile(file, bundle) {
    if (file && file instanceof File) {
      var omit = bundle.allOmits;

      if (omit[file.path]) {
        return null;
      }
    }

    return file;
  }
});
Base.$extend({
  $class: "plugin.bundle.NpmProcessor",
  host: null,
  $init: function $init(host) {
    this.host = host;
  },
  $afterHostInit: function $afterHostInit() {
    var self = this;
    self.host.on("process-file", self.processNpmEntry, self);
  },
  processNpmEntry: function processNpmEntry(file, bundle) {
    if (file && file instanceof File) {
      var info = file.getFileInfo();

      if (!info.npm) {
        return file;
      }

      var Bundle = ns.get("Bundle");
      var npmBundle = Bundle.get(info.npm.module, "npm"); // avoid infinite recursion

      if (npmBundle === bundle) {
        return file;
      }

      if (!npmBundle.getOption("version")) {
        npmBundle.setOption("module", info.npm.module);
        npmBundle.setOption("version", info.npm.version);
        npmBundle.setOption("wrap", true);
      }

      if (npmBundle.getOption("version") != info.npm.version) {
        throw "Got two different versions of " + info.npm.module + " module: " + npmBundle.getOption("version") + " != " + info.npm.version;
      }

      npmBundle.addFile(file);
      return npmBundle;
    }

    return file;
  }
});
Base.$extend({
  $class: "plugin.bundle.Names",
  host: null,
  $init: function $init(host) {
    this.host = host;
  },
  $afterHostInit: function $afterHostInit() {
    var self = this;
    self.host.on("prepare-module-names", self.prepareModuleNames, self);
    self.host.on("prepare-file-names", self.prepareFileNames, self);
  },
  prepareModuleNames: function prepareModuleNames(bundle) {
    // iterate through all module imports collected from all files
    bundle.imports.forEach(function (imp) {
      var firstGlobal;
      imp.names = imp.names.slice().filter(function (name) {
        var used = false; // if name hasn't been used
        // everything is ok

        if (!bundle.globals.hasOwnProperty(name)) {
          bundle.globals[name] = imp.module;
          !firstGlobal && (firstGlobal = name);
        } else {
          used = true;
        }

        imp.in.forEach(function (file) {
          var local = file.getImport(imp);

          if (!used) {
            // name goes to globals,
            // so we remove it from file's 
            // import record, and if there is no more names,
            // skip local import at all
            local.removeName(name);

            if (local.names.length === 0) {
              local.setSkipped(true);
            }
          } else {
            // the name is conflicting with others.
            // if by that time we don't have one global name,
            // we use import id.
            !firstGlobal && (firstGlobal = imp.id);
            imp.addName(firstGlobal);
            bundle.globals[firstGlobal] = true; // then we wrap the file 
            // and use the name locally,
            // assigning it from gloval var file.setOption("wrap", true);

            local.setNameFrom(name, firstGlobal);
          }
        }); // remove conflicting names from bundle's import list

        return !used;
      });
    });
  },
  prepareFileNames: function prepareFileNames(bundle) {
    // iterate over files on top level
    bundle.buildList.forEach(function (file) {
      if (file instanceof File) {
        file.getParents().forEach(function (imp) {
          var firstGlobal;
          imp.names = imp.names.slice().filter(function (name) {
            var used = false; // if name hasn't been used
            // everything is ok

            if (!bundle.globals.hasOwnProperty(name) || bundle.globals[name] == file.path) {
              bundle.globals[name] = file.path;
              !firstGlobal && (firstGlobal = name);
              file.setOption("as", name);
            } else {
              used = true; // the name is conflicting with others.
              // if by that time we don't have one global name,
              // we use import id.

              !firstGlobal && (firstGlobal = file.id);
              bundle.globals[firstGlobal] = true;
              file.setOption("as", firstGlobal);
            } // if this file is imported from outside
            // current bundle; or global name is taken


            if (!file.bundle.hasFile(imp.file) || used) {
              imp.file.setOption("wrap", true);
              var local = imp.file.getImport({
                file: file
              });

              if (local) {
                local.setNameFrom(name, [file.bundle.getUniqueName(), firstGlobal]);
              }
            }

            return !used;
          });

          if (imp.names.indexOf(firstGlobal) === -1) {
            imp.names.push(firstGlobal);
          }
        });
      }
    });
  }
});
/**
 * Resolve list of files using path pattern. Uses <code>glob</code> internally.
 * @param {string} pattern 
 * @param {string} ext 
 * @returns {array}
 */

var getFileList = function getFileList(pattern, ext) {
  if (ext && pattern.indexOf("." + ext) != pattern.length - ext.length - 1) {
    pattern += '/*.' + ext;
  }

  return glob.sync(pattern);
};
/*module.exports = function(directory, ext) {

    var fileList,
        filePath,
        levels = 0,
        files = [];

    if (!directory) {
        return [];
    }


    if (directory.substr(directory.length - 1) == "*") {
        levels++;
    }
    if (directory.substr(directory.length - 2) == "**") {
        levels++;
    }

    if (levels) {
        directory = directory.substr(0, directory.length - (levels + 1));
    }
    directory = path.normalize(directory);

    var readDir = function(dir) {
        fileList    = fs.readdirSync(dir);

        fileList.forEach(function(filename) {
            filePath = path.normalize(dir + "/" + filename);

            if (isFile(filePath)) {

                if (!ext) {
                    files.push(filePath);
                }
                else if (typeof ext == "string" && path.extname(filePath).substr(1) == ext) {
                    files.push(filePath);
                }
                else if (typeof ext != "string" && path.extname(filePath).substr(1).match(ext)) {
                    files.push(filePath);
                }
            }
            else if (isDir(filePath) && levels > 1) {
                readDir(filePath);
            }
        });
    };

    if (levels > 0 || isDir(directory)) {
        readDir(directory);
    }
    else {
        files    = [directory];
    }

    return files;
};*/

/**
 * metaphorjs.json wrapper
 * @class Config
 */


var Config = function () {
  var defaults = {
    mixin: {},
    build: {},
    docs: {}
  };
  var all = {};
  var Config = Base.$extend({
    /**
     * @type {string}
     */
    path: null,

    /**
     * @type {string}
     */
    base: null,

    /**
     * @constructor
     * @param {string} jsonFilePath 
     */
    $init: function $init(jsonFilePath) {
      var self = this;
      self.path = path.normalize(jsonFilePath);
      self.base = path.dirname(self.path) + '/';

      var json = require(self.path),
          key;

      for (key in defaults) {
        self[key] = defaults[key];
      }

      for (key in json) {
        self[key] = json[key];
      }
    },
    getBuildConfig: function getBuildConfig(name) {
      var cfg = this.build[name] || this.mixin[name];

      if (cfg) {
        if (cfg.extend) {
          var base = this.getBuildConfig(cfg.extend);
          cfg = extend({}, base, cfg, true, false);
          delete cfg.extend;
        }

        return cfg;
      }

      return null;
    }
  }, {
    /**
     * Get wrapped metaphorjs.json by file path
     * @static
     * @method
     * @param {string} filePath 
     */
    get: function get(filePath) {
      filePath = path.normalize(filePath);

      if (!all[filePath]) {
        all[filePath] = new Config(filePath);
      }

      return all[filePath];
    },

    /**
     * Get wrapped metaphorjs.json by current directory
     * @static
     * @method
     */
    getCurrent: function getCurrent() {
      var cwd = process.cwd(),
          file = cwd + "/metaphorjs.json";

      if (fs.existsSync(file)) {
        return Config.get(file);
      }

      return null;
    }
  });
  return Config;
}();
/**
 * @mixin mixin.Collector
 */


ns.register("mixin.Collector", {
  $beforeInit: function $beforeInit() {
    this.allOmits = {};
    this.allReplaces = {};
    this.collected = {};
  },
  $afterInit: function $afterInit() {
    // return first === false result and skip the rest of listeners
    this.$$observable.createEvent("collect-filter", false);
  },
  _processMixin: function _processMixin(mixin, config) {
    var self = this,
        files = mixin.files || [],
        omit = mixin.omit || [],
        replace = mixin.replace || [],
        base = config.base;
    omit.forEach(function (omitFile) {
      getFileList(resolvePath(omitFile, [base]), "js").forEach(function (omitFile) {
        self.allOmits[omitFile] = true;
      });
    });
    replace.forEach(function (row) {
      self.allReplaces[resolvePath(row[0], [base])] = resolvePath(row[1], [base]);
    });
    files.forEach(function (file) {
      self._processFileItem(file, config);
    });
  },
  _processFileItem: function _processFileItem(fileDef, config) {
    if (typeof fileDef === "string") {
      fileDef = [fileDef];
    }

    var self = this,
        file = fileDef[0],
        json; // local mixin: simple name and nothing else: ["name"]

    if (file.match(/^[a-z0-9]+$/i)) {
      if (!config.mixin[file]) {
        throw "Mixin " + file + " not found in " + config.path;
      }

      self._processMixin(config.mixin[file], config);
    } // external mixin: [path/to/json, "name"]
    else if (path.extname(file) === ".json") {
        json = Config.get(resolvePath(file));

        if (!json) {
          throw "Json file not found: " + file;
        }

        if (!json.mixin[fileDef[1]]) {
          throw "Mixin " + fileDef[1] + " not found in " + json.path;
        }

        self._processMixin(json.mixin[fileDef[1]], json);
      } else {
        getFileList(resolvePath(file, [config.base]), "js").forEach(function (file) {
          var f = File.get(file, fileDef[1]);
          f.setOption("base", config.base);
          var res = self.trigger("collect-filter", f, self);

          if (res !== false) {
            self.collected[f.path] = f;
          }
        });
      }
  }
});

var Bundle = function () {
  var all = {};
  /**
   * @class Bundle
   */

  var Bundle = Base.$extend({
    $class: "Bundle",
    $mixins: ["mixin.WithImports", "mixin.Collector"],
    id: null,
    name: null,
    type: null,
    top: false,
    parent: null,
    $constructor: function $constructor() {
      this.$plugins.push("plugin.bundle.FileProcessor");
      this.$plugins.push("plugin.bundle.NpmProcessor");
      this.$plugins.push("plugin.bundle.Names");
      this.$plugins.push("plugin.code.Generator");
      this.$super(arguments);
    },

    /**
     * @constructor
     * @param {string} name
     * @param {string} type
     */
    $init: function $init(name, type) {
      var self = this;
      self.$super();
      self.$$observable.createEvent("process-file", "pipe");
      self.id = nextUid();
      self.name = name;
      self.type = type;
      self.buildList = [];
      self.included = {};
      self.globals = {};
      self.on("set_expose", self._setArrayOption, self);
      self.trigger("init", self);
    },

    /**
     * Set current bundle
     * @method
     * @param {Bundle} bundle
     */
    setBundle: function setBundle(bundle) {
      this.parent = bundle;
    },

    /**
     * Collect files as defined in json file
     * @method
     * @param {Config} config
     * @param {string} name Build name
     */
    collect: function collect(config, name) {
      var self = this,
          mixin = config.getBuildConfig(name);

      if (!mixin) {
        throw mixin + " not found in " + config.path;
      }

      if (mixin.options) {
        self.setOptions(mixin.options);
      }

      self._processMixin(mixin, config);

      var replacement;

      for (var path in self.collected) {
        while (self.allReplaces[path]) {
          replacement = File.get(self.allReplaces[path]);
          self.collected[replacement.path] = replacement;
          delete self.collected[path];
          path = replacement.path;
        }
      }

      for (path in self.allOmits) {
        if (self.collected[path]) {
          delete self.collected[path];
        }
      }

      self.trigger("files-collected", self);
    },

    /**
     * Resolve all required files, collect inner bundles
     * @method
     */
    prepareBuildList: function prepareBuildList() {
      var self = this;

      for (var path in self.collected) {
        self.addFile(self.collected[path]);
      } // hoist all module reqs
      // top level only


      self.getImports("module", true, true).forEach(self.addImport, self);
      self.trigger("imports-hoisted", self);
      self.trigger("prepare-module-names", self);
      self.trigger("prepare-file-names", self);
      self.eachBundle(function (b) {
        b.trigger("prepare-file-names", b);
      }); // make inner bundles expose some of its imports

      self.eachFile(function (file) {
        var b = file.bundle;

        if (!b.top) {
          file.getParents().forEach(function (imp) {
            if (!b.hasFile(imp.file)) {
              b.setOption("expose", imp.names);
            }
          });
        }
      });
      self.trigger("build-list-ready", self);
    },

    /**
     * Add already processed file to the build list
     * @method
     * @param {File} file
     */
    addFile: function addFile(file) {
      var self = this;

      if (!self.included[file.id]) {
        file = self.trigger("process-file", file, self);

        if (file && !self.included[file.id]) {
          self.included[file.id] = true;
          self.buildList.push(file);
          file.setBundle(self);
        }
      }
    },

    /**
     * @ignore
     */
    toString: function toString() {
      return this.getContent();
    },

    /**
     * Checks if this bundle can't be included to global scope
     * without wrapping it first
     * @method
     * @returns {bool}
     */
    needsWrapping: function needsWrapping() {
      return this.getOption("wrap") || this.top === false || false;
    },
    getUniqueName: function getUniqueName() {
      return "bundle_" + this.id;
    },
    hasGlobalVar: function hasGlobalVar(name) {
      return this.globals.hasOwnProperty(name);
    },
    getGlobalVarOrigin: function getGlobalVarOrigin(name) {
      return this.globals[name];
    },

    /**
     * Get concatenated content
     * @method
     * @returns {string}
     */
    getContent: function getContent() {
      var self = this,
          code = "",
          strict = self.getOption("strict"),
          wrap = self.needsWrapping(),
          globl = self.getOption("global"),
          expose = self.getOption("expose"),
          amd = self.getOption("amd"),
          ret = self.getOption("return"),
          doesExport = self.getOption("exports"),
          exposeName = self.getOption("exposeIn", self.getUniqueName());
      code += '/* BUNDLE START ' + self.id + ' */';
      code += self.trigger("code-module-imports", self).join("\n");
      code += this.buildList.join("\n");

      if (expose) {
        code = self.trigger("code-expose", code, exposeName, expose);
      }

      if (globl) {
        code += self.trigger("code-global", globl === true ? 'MetaphorJs' : globl, exposeName);
      }

      if (wrap) {
        if (expose || ret) {
          code = self.trigger("code-return", code, ret || exposeName);
        }

        code = self.trigger("code-wrap", code);

        if (!self.top) {
          code = self.trigger("code-prepend-var", code, self.getUniqueName());
        }

        if (doesExport && expose) {
          code = self.trigger("code-export", false) + code;
        }
      } else {
        if (doesExport) {
          code += self.trigger("code-export", doesExport === true ? exposeName : doesExport);
        }
      }

      if (amd) {
        if (!amd.return) {
          amd.return = exposeName;
        }

        code = self.trigger("code-amd-module", code, amd, self);
      }

      code += '/* BUNDLE END ' + self.id + ' */';

      if (strict !== false) {
        code = '\n' + code;
      }

      return code;
    },

    /**
     * Iterate over all files in this bundle and sub-bundles
     * @param {function} fn
     * @param {object} context 
     */
    eachFile: function eachFile(fn, context) {
      var self = this;
      self.buildList.forEach(function (entry) {
        if (entry instanceof File) {
          fn.call(context, entry);
        } else {
          entry.eachFile(fn, context);
        }
      });
    },

    /**
     * Iterate over all sub bundles
     * @param {function} fn
     * @param {object} context 
     */
    eachBundle: function eachBundle(fn, context) {
      var self = this;
      self.buildList.forEach(function (entry) {
        if (entry instanceof Bundle) {
          fn.call(context, entry);
          entry.eachBundle(fn, context);
        }
      });
    },

    /**
     * @method
     * @param {File} file
     * @returns {bool}
     */
    hasFile: function hasFile(file) {
      return this.buildList.indexOf(file) !== -1;
    },

    /**
     * Get a list of files that import given module or file
     * @method
     * @param {object} def
     * @param {string} name optional; name under which file is imported
     * @returns {array}
     */
    whoImports: function whoImports(def, name) {
      var self = this;

      if (def.file) {
        return def.file.getParents().filter(function (file) {
          var imp = file.doesImport(def);
          return imp ? name ? imp.hasName(name) : true : false;
        });
      } else {
        var list = [];
        self.eachFile(function (file) {
          var subd;

          if (subd = file.doesImport(def)) {
            if (!name || subd.hasName(name)) {
              list.push(file);
            }
          }
        });
        return list;
      }
    }
  }, // Static methods
  {
    get: function get(name, type) {
      var fullName = "" + type + "/" + name;

      if (!all[fullName]) {
        all[fullName] = new Bundle(name, type);
      }

      return all[fullName];
    },
    exists: function exists(name, type) {
      return !!all["" + type + "/" + name];
    }
  });
  return Bundle;
}();

var isFile = function isFile(filePath) {
  return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
};
/**
* @class Builder
*/


var Builder = Base.$extend({
  /**
   * @constructor
   */
  $init: function $init(buildName, projectFile) {
    if (!isFile(projectFile) && !(projectFile instanceof Config)) {
      throw projectFile + " not found";
    }

    var self = this;
    self.$$observable.createEvent("pipe", {
      returnResult: "pipe",
      expectPromises: true,
      resolvePromises: true
    });
    self.config = projectFile instanceof Config ? projectFile : Config.get(projectFile);
    self.projectFile = projectFile instanceof Config ? projectFile.path : projectFile;
    self.bundle = Bundle.get(buildName, "build");
    self.buildName = buildName;
    self.bundle.top = true;
    self.trigger("init", self);
  },
  getTargetPath: function getTargetPath() {
    var self = this,
        target;
    target = self.config.getBuildConfig(self.buildName).target;
    target = path.resolve(self.config.base, target);
    return target;
  },
  getBuilderDir: function getBuilderDir() {
    return path.normalize(__dirname) + "/..";
  },
  getRandTmpFile: function getRandTmpFile() {
    var name = "/tmp/build_" + nextUid() + ".js";

    if (fs.existsSync(name)) {
      return this.getRandTmpFile();
    }

    return name;
  },
  build: function build() {
    var self = this,
        cfg = self.config.getBuildConfig(self.buildName),
        pipe = cfg.pipe || [];

    if (typeof pipe === "string") {
      pipe = pipe.split("|");
    }

    if (pipe.length === 0) {
      pipe = ["build", "write"];
    }

    pipe.forEach(function (processor) {
      if (self["_" + processor]) {
        self.on("pipe", self["_" + processor], self);
      }
    });
    self.trigger("pipe");
    self.$$observable.removeAllListeners("pipe");
  },

  /**
   * Create build
   * @method
   */
  _build: function _build() {
    var self = this,
        code;
    console.log("Building " + self.buildName);
    self.trigger("before-build", self);
    self.bundle.collect(self.config, self.buildName);
    self.trigger("after-collect", self);
    self.bundle.prepareBuildList();
    self.trigger("after-build-list", self);
    code = self.bundle.getContent();
    var res = self.trigger("build-ready", self, code);

    if (typeof res === "string") {
      code = res;
    }

    return Promise.resolve(code);
  },
  _compile: function _compile(code) {
    var self = this,
        cwd = process.cwd(),
        bdir = self.getBuilderDir(),
        promise;
    console.log("Compiling " + self.buildName);
    promise = new Promise(function (resolve, reject) {
      process.chdir(bdir);
      var target = self.getRandTmpFile(),
          out = fs.createWriteStream(target),
          args = ["ccjs"],
          bin = "/usr/local/bin/npx",
          source = self.getRandTmpFile(),
          proc;
      fs.writeFileSync(source, code);
      args.push(source);
      args.push('--language_in=ECMASCRIPT5_STRICT');
      proc = cp.spawn(bin, args);
      proc.stderr.pipe(process.stderr);
      proc.stdout.pipe(out);
      proc.on("exit", function () {
        process.chdir(cwd);
        var code = fs.readFileSync(target).toString();
        fs.unlinkSync(source);
        fs.unlinkSync(target);
        resolve(code);
      });
      proc.on("error", function (error) {
        console.log(error);
        reject(error);
      });
    });
    return promise;
  },
  _babel: function _babel(code) {
    var self = this,
        cwd = process.cwd(),
        bdir = self.getBuilderDir(),
        bcfg = fs.existsSync(cwd + "/.babelrc") ? cwd + "/.babelrc" : fs.existsSync(bdir + "/.babelrc") ? bdir + "/.babelrc" : null,
        promise;
    console.log("Running babel " + self.buildName);
    promise = new Promise(function (resolve, reject) {
      var target = self.getRandTmpFile(),
          out = fs.createWriteStream(target),
          args = ["babel"],
          bin = "/usr/local/bin/npx",
          source = self.getRandTmpFile(),
          proc;
      fs.writeFileSync(source, code);
      args.push(source);

      if (bcfg) {
        args.push("--config-file");
        args.push(bcfg);
      }

      proc = cp.spawn(bin, args);
      proc.stderr.pipe(process.stderr);
      proc.stdout.pipe(out);
      proc.on("exit", function () {
        var code = fs.readFileSync(target).toString();
        fs.unlinkSync(source);
        fs.unlinkSync(target);
        resolve(code);
      });
      proc.on("error", function (error) {
        console.log(error);
        reject(error);
      });
    });
    return promise;
  },
  _write: function _write(code) {
    var self = this,
        target = self.getTargetPath();
    console.log("Writing " + self.buildName + " to " + target);
    fs.writeFileSync(target, code);
    self.trigger("build-written", self, target, code);
    return Promise.resolve(code);
  }
});
/**
 * Build a bundle 
 * @function build
 * @param {string} name 
 */

var build = function build(name) {
  var config = Config.getCurrent();

  if (!config) {
    throw "metaphorjs.json not found in current directory!";
  }

  if (!name) {
    throw "Must specify build";
  }

  var builder = new Builder(name, config);
  builder.build();
};
/**
 * @function
 * @param {string} cmd
 * @param {string} args
 * @returns {Promise}
 */


var passthru = function passthru(cmd, args) {
  var proc = cp.spawn(cmd, args),
      deferred = new Promise(function (resolve, reject) {
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    process.stdin.pipe(proc.stdin);
    proc.on("exit", function (code) {
      process.stdin.unpipe(proc.stdin);

      if (code == 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
  return deferred;
};

var bundle_003 = {};
bundle_003['Bundle'] = Bundle;
bundle_003['Builder'] = Builder;
bundle_003['File'] = File;
bundle_003['Config'] = Config;
bundle_003['Import'] = Import;
bundle_003['Base'] = Base;
bundle_003['build'] = build;
bundle_003['compile'] = compile;
module.exports = bundle_003;
/* BUNDLE END 003 */

