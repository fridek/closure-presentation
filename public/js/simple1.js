// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Bootstrap for the Google JS Library (Closure).
 *
 * In uncompiled mode base.js will write out Closure's deps file, unless the
 * global <code>CLOSURE_NO_DEPS</code> is set to true.  This allows projects to
 * include their own deps file(s) from different locations.
 *
 */


/**
 * @define {boolean} Overridden to true by the compiler when --closure_pass
 *     or --mark_as_compiled is specified.
 */
var COMPILED = false;


/**
 * Base namespace for the Closure library.  Checks to see goog is
 * already defined in the current scope before assigning to prevent
 * clobbering if base.js is loaded more than once.
 *
 * @const
 */
var goog = goog || {}; // Identifies this file as the Closure base.


/**
 * Reference to the global context.  In most cases this will be 'window'.
 */
goog.global = this;


/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production js_binary can be easily stripped
 * by specifying --define goog.DEBUG=false to the JSCompiler. For example, most
 * toString() methods should be declared inside an "if (goog.DEBUG)" conditional
 * because they are generally used for debugging purposes and it is difficult
 * for the JSCompiler to statically determine whether they are used.
 */
goog.DEBUG = true;


/**
 * @define {string} LOCALE defines the locale being used for compilation. It is
 * used to select locale specific data to be compiled in js binary. BUILD rule
 * can specify this value by "--define goog.LOCALE=<locale_name>" as JSCompiler
 * option.
 *
 * Take into account that the locale code format is important. You should use
 * the canonical Unicode format with hyphen as a delimiter. Language must be
 * lowercase, Language Script - Capitalized, Region - UPPERCASE.
 * There are few examples: pt-BR, en, en-US, sr-Latin-BO, zh-Hans-CN.
 *
 * See more info about locale codes here:
 * http://www.unicode.org/reports/tr35/#Unicode_Language_and_Locale_Identifiers
 *
 * For language codes you should use values defined by ISO 693-1. See it here
 * http://www.w3.org/WAI/ER/IG/ert/iso639.htm. There is only one exception from
 * this rule: the Hebrew language. For legacy reasons the old code (iw) should
 * be used instead of the new code (he), see http://wiki/Main/IIISynonyms.
 */
goog.LOCALE = 'en';  // default to en


/**
 * Creates object stubs for a namespace.  The presence of one or more
 * goog.provide() calls indicate that the file defines the given
 * objects/namespaces.  Build tools also scan for provide/require statements
 * to discern dependencies, build dependency files (see deps.js), etc.
 * @see goog.require
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part".
 */
goog.provide = function(name) {
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice. This is intended
    // to teach new developers that 'goog.provide' is effectively a variable
    // declaration. And when JSCompiler transforms goog.provide into a real
    // variable declaration, the compiled JS should work the same as the raw
    // JS--even when the raw JS uses goog.provide incorrectly.
    if (goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];

    var namespace = name;
    while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
      if (goog.getObjectByName(namespace)) {
        break;
      }
      goog.implicitNamespaces_[namespace] = true;
    }
  }

  goog.exportPath_(name);
};


/**
 * Marks that the current file should only be used for testing, and never for
 * live code in production.
 * @param {string=} opt_message Optional message to add to the error that's
 *     raised when used in production code.
 */
goog.setTestOnly = function(opt_message) {
  if (COMPILED && !goog.DEBUG) {
    opt_message = opt_message || '';
    throw Error('Importing test-only code into non-debug environment' +
                opt_message ? ': ' + opt_message : '.');
  }
};


if (!COMPILED) {

  /**
   * Check if the given name has been goog.provided. This will return false for
   * names that are available only as implicit namespaces.
   * @param {string} name name of the object to look for.
   * @return {boolean} Whether the name has been provided.
   * @private
   */
  goog.isProvided_ = function(name) {
    return !goog.implicitNamespaces_[name] && !!goog.getObjectByName(name);
  };

  /**
   * Namespaces implicitly defined by goog.provide. For example,
   * goog.provide('goog.events.Event') implicitly declares
   * that 'goog' and 'goog.events' must be namespaces.
   *
   * @type {Object}
   * @private
   */
  goog.implicitNamespaces_ = {};
}


/**
 * Builds an object structure for the provided namespace path,
 * ensuring that names that already exist are not overwritten. For
 * example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by goog.provide and goog.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {*=} opt_object the object to expose at the end of the path.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 * @private
 */
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || goog.global;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  // Certain browsers cannot parse code in the form for((a in b); c;);
  // This pattern is produced by the JSCompiler when it collapses the
  // statement above into the conditional loop below. To prevent this from
  // happening, use a for-loop and reserve the init logic as below.

  // Parentheses added to eliminate strict JS warning in Firefox.
  for (var part; parts.length && (part = parts.shift());) {
    if (!parts.length && goog.isDef(opt_object)) {
      // last part and we have an object; use it
      cur[part] = opt_object;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Returns an object based on its fully qualified external name.  If you are
 * using a compilation pass that renames property names beware that using this
 * function will not find renamed properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object=} opt_obj The object within which to look; default is
 *     |goog.global|.
 * @return {?} The value (object or primitive) or, if not found, null.
 */
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || goog.global;
  for (var part; part = parts.shift(); ) {
    if (goog.isDefAndNotNull(cur[part])) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};


/**
 * Globalizes a whole namespace, such as goog or goog.lang.
 *
 * @param {Object} obj The namespace to globalize.
 * @param {Object=} opt_global The object to add the properties to.
 * @deprecated Properties may be explicitly exported to the global scope, but
 *     this should no longer be done in bulk.
 */
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for (var x in obj) {
    global[x] = obj[x];
  }
};


/**
 * Adds a dependency from a file to the files it requires.
 * @param {string} relPath The path to the js file.
 * @param {Array} provides An array of strings with the names of the objects
 *                         this file provides.
 * @param {Array} requires An array of strings with the names of the objects
 *                         this file requires.
 */
goog.addDependency = function(relPath, provides, requires) {
  if (!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, '/');
    var deps = goog.dependencies_;
    for (var i = 0; provide = provides[i]; i++) {
      deps.nameToPath[provide] = path;
      if (!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {};
      }
      deps.pathToNames[path][provide] = true;
    }
    for (var j = 0; require = requires[j]; j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  }
};




// NOTE(nnaze): The debug DOM loader was included in base.js as an orignal
// way to do "debug-mode" development.  The dependency system can sometimes
// be confusing, as can the debug DOM loader's asyncronous nature.
//
// With the DOM loader, a call to goog.require() is not blocking -- the
// script will not load until some point after the current script.  If a
// namespace is needed at runtime, it needs to be defined in a previous
// script, or loaded via require() with its registered dependencies.
// User-defined namespaces may need their own deps file.  See http://go/js_deps,
// http://go/genjsdeps, or, externally, DepsWriter.
// http://code.google.com/closure/library/docs/depswriter.html
//
// Because of legacy clients, the DOM loader can't be easily removed from
// base.js.  Work is being done to make it disableable or replaceable for
// different environments (DOM-less JavaScript interpreters like Rhino or V8,
// for example). See bootstrap/ for more information.


/**
 * @define {boolean} Whether to enable the debug loader.
 *
 * If enabled, a call to goog.require() will attempt to load the namespace by
 * appending a script tag to the DOM (if the namespace has been registered).
 *
 * If disabled, goog.require() will simply assert that the namespace has been
 * provided (and depend on the fact that some outside tool correctly ordered
 * the script).
 */
goog.ENABLE_DEBUG_LOADER = true;


/**
 * Implements a system for the dynamic resolution of dependencies
 * that works in parallel with the BUILD system. Note that all calls
 * to goog.require will be stripped by the JSCompiler when the
 * --closure_pass option is used.
 * @see goog.provide
 * @param {string} name Namespace to include (as was given in goog.provide())
 *     in the form "goog.package.part".
 */
goog.require = function(name) {

  // if the object already exists we do not need do do anything
  // TODO(arv): If we start to support require based on file name this has
  //            to change
  // TODO(arv): If we allow goog.foo.* this has to change
  // TODO(arv): If we implement dynamic load after page load we should probably
  //            not remove this code for the compiled output
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      return;
    }

    if (goog.ENABLE_DEBUG_LOADER) {
      var path = goog.getPathFromDeps_(name);
      if (path) {
        goog.included_[path] = true;
        goog.writeScripts_();
        return;
      }
    }

    var errorMessage = 'goog.require could not find: ' + name;
    if (goog.global.console) {
      goog.global.console['error'](errorMessage);
    }


      throw Error(errorMessage);

  }
};


/**
 * Path for included scripts
 * @type {string}
 */
goog.basePath = '';


/**
 * A hook for overriding the base path.
 * @type {string|undefined}
 */
goog.global.CLOSURE_BASE_PATH;


/**
 * Whether to write out Closure's deps file. By default,
 * the deps are written.
 * @type {boolean|undefined}
 */
goog.global.CLOSURE_NO_DEPS;


/**
 * A function to import a single script. This is meant to be overridden when
 * Closure is being run in non-HTML contexts, such as web workers. It's defined
 * in the global scope so that it can be set before base.js is loaded, which
 * allows deps.js to be imported properly.
 *
 * The function is passed the script source, which is a relative URI. It should
 * return true if the script was imported, false otherwise.
 */
goog.global.CLOSURE_IMPORT_SCRIPT;


/**
 * Null function used for default values of callbacks, etc.
 * @return {void} Nothing.
 */
goog.nullFunction = function() {};


/**
 * The identity function. Returns its first argument.
 *
 * @param {*=} opt_returnValue The single value that will be returned.
 * @param {...*} var_args Optional trailing arguments. These are ignored.
 * @return {?} The first argument. We can't know the type -- just pass it along
 *      without type.
 * @deprecated Use goog.functions.identity instead.
 */
goog.identityFunction = function(opt_returnValue, var_args) {
  return opt_returnValue;
};


/**
 * When defining a class Foo with an abstract method bar(), you can do:
 *
 * Foo.prototype.bar = goog.abstractMethod
 *
 * Now if a subclass of Foo fails to override bar(), an error
 * will be thrown when bar() is invoked.
 *
 * Note: This does not take the name of the function to override as
 * an argument because that would make it more difficult to obfuscate
 * our JavaScript code.
 *
 * @type {!Function}
 * @throws {Error} when invoked to indicate the method should be
 *   overridden.
 */
goog.abstractMethod = function() {
  throw Error('unimplemented abstract method');
};


/**
 * Adds a {@code getInstance} static method that always return the same instance
 * object.
 * @param {!Function} ctor The constructor for the class to add the static
 *     method to.
 */
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    if (ctor.instance_) {
      return ctor.instance_;
    }
    if (goog.DEBUG) {
      // NOTE: JSCompiler can't optimize away Array#push.
      goog.instantiatedSingletons_[goog.instantiatedSingletons_.length] = ctor;
    }
    return ctor.instance_ = new ctor;
  };
};


/**
 * All singleton classes that have been instantiated, for testing. Don't read
 * it directly, use the {@code goog.testing.singleton} module. The compiler
 * removes this variable if unused.
 * @type {!Array.<!Function>}
 * @private
 */
goog.instantiatedSingletons_ = [];


if (!COMPILED && goog.ENABLE_DEBUG_LOADER) {
  /**
   * Object used to keep track of urls that have already been added. This
   * record allows the prevention of circular dependencies.
   * @type {Object}
   * @private
   */
  goog.included_ = {};


  /**
   * This object is used to keep track of dependencies and other data that is
   * used for loading scripts
   * @private
   * @type {Object}
   */
  goog.dependencies_ = {
    pathToNames: {}, // 1 to many
    nameToPath: {}, // 1 to 1
    requires: {}, // 1 to many
    // used when resolving dependencies to prevent us from
    // visiting the file twice
    visited: {},
    written: {} // used to keep track of script files we have written
  };


  /**
   * Tries to detect whether is in the context of an HTML document.
   * @return {boolean} True if it looks like HTML document.
   * @private
   */
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != 'undefined' &&
           'write' in doc;  // XULDocument misses write.
  };


  /**
   * Tries to detect the base path of the base.js script that bootstraps Closure
   * @private
   */
  goog.findBasePath_ = function() {
    if (goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else if (!goog.inHtmlDocument_()) {
      return;
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName('script');
    // Search backwards since the current script is in almost all cases the one
    // that has base.js.
    for (var i = scripts.length - 1; i >= 0; --i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf('?');
      var l = qmark == -1 ? src.length : qmark;
      if (src.substr(l - 7, 7) == 'base.js') {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };


  /**
   * Imports a script if, and only if, that script hasn't already been imported.
   * (Must be called at execution time)
   * @param {string} src Script source.
   * @private
   */
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT ||
        goog.writeScriptTag_;
    if (!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true;
    }
  };


  /**
   * The default implementation of the import function. Writes a script tag to
   * import the script.
   *
   * @param {string} src The script source.
   * @return {boolean} True if the script was imported, false otherwise.
   * @private
   */
  goog.writeScriptTag_ = function(src) {
    if (goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      doc.write(
          '<script type="text/javascript" src="' + src + '"></' + 'script>');
      return true;
    } else {
      return false;
    }
  };


  /**
   * Resolves dependencies based on the dependencies added using addDependency
   * and calls importScript_ in the correct order.
   * @private
   */
  goog.writeScripts_ = function() {
    // the scripts we need to write this time
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;

    function visitNode(path) {
      if (path in deps.written) {
        return;
      }

      // we have already visited this one. We can get here if we have cyclic
      // dependencies
      if (path in deps.visited) {
        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
        return;
      }

      deps.visited[path] = true;

      if (path in deps.requires) {
        for (var requireName in deps.requires[path]) {
          // If the required name is defined, we assume that it was already
          // bootstrapped by other means.
          if (!goog.isProvided_(requireName)) {
            if (requireName in deps.nameToPath) {
              visitNode(deps.nameToPath[requireName]);
            } else {
              throw Error('Undefined nameToPath for ' + requireName);
            }
          }
        }
      }

      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
    }

    for (var path in goog.included_) {
      if (!deps.written[path]) {
        visitNode(path);
      }
    }

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i]);
      } else {
        throw Error('Undefined script input');
      }
    }
  };


  /**
   * Looks at the dependency rules and tries to determine the script file that
   * fulfills a particular rule.
   * @param {string} rule In the form goog.namespace.Class or project.script.
   * @return {?string} Url corresponding to the rule, or null.
   * @private
   */
  goog.getPathFromDeps_ = function(rule) {
    if (rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };

  goog.findBasePath_();

  // Allow projects to manage the deps files themselves.
  if (!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + 'deps.js');
  }
}



//==============================================================================
// Language Enhancements
//==============================================================================


/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {*} value The value to get the type of.
 * @return {string} The name of the type.
 */
goog.typeOf = function(value) {
  var s = typeof value;
  if (s == 'object') {
    if (value) {
      // Check these first, so we can avoid calling Object.prototype.toString if
      // possible.
      //
      // IE improperly marshals tyepof across execution contexts, but a
      // cross-context object will still return false for "instanceof Object".
      if (value instanceof Array) {
        return 'array';
      } else if (value instanceof Object) {
        return s;
      }

      // HACK: In order to use an Object prototype method on the arbitrary
      //   value, the compiler requires the value be cast to type Object,
      //   even though the ECMA spec explicitly allows it.
      var className = Object.prototype.toString.call(
          /** @type {Object} */ (value));
      // In Firefox 3.6, attempting to access iframe window objects' length
      // property throws an NS_ERROR_FAILURE, so we need to special-case it
      // here.
      if (className == '[object Window]') {
        return 'object';
      }

      // We cannot always use constructor == Array or instanceof Array because
      // different frames have different Array objects. In IE6, if the iframe
      // where the array was created is destroyed, the array loses its
      // prototype. Then dereferencing val.splice here throws an exception, so
      // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
      // so that will work. In this case, this function will return false and
      // most array functions will still work because the array is still
      // array-like (supports length and []) even though it has lost its
      // prototype.
      // Mark Miller noticed that Object.prototype.toString
      // allows access to the unforgeable [[Class]] property.
      //  15.2.4.2 Object.prototype.toString ( )
      //  When the toString method is called, the following steps are taken:
      //      1. Get the [[Class]] property of this object.
      //      2. Compute a string value by concatenating the three strings
      //         "[object ", Result(1), and "]".
      //      3. Return Result(2).
      // and this behavior survives the destruction of the execution context.
      if ((className == '[object Array]' ||
           // In IE all non value types are wrapped as objects across window
           // boundaries (not iframe though) so we have to do object detection
           // for this edge case
           typeof value.length == 'number' &&
           typeof value.splice != 'undefined' &&
           typeof value.propertyIsEnumerable != 'undefined' &&
           !value.propertyIsEnumerable('splice')

          )) {
        return 'array';
      }
      // HACK: There is still an array case that fails.
      //     function ArrayImpostor() {}
      //     ArrayImpostor.prototype = [];
      //     var impostor = new ArrayImpostor;
      // this can be fixed by getting rid of the fast path
      // (value instanceof Array) and solely relying on
      // (value && Object.prototype.toString.vall(value) === '[object Array]')
      // but that would require many more function calls and is not warranted
      // unless closure code is receiving objects from untrusted sources.

      // IE in cross-window calls does not correctly marshal the function type
      // (it appears just as an object) so we cannot use just typeof val ==
      // 'function'. However, if the object has a call property, it is a
      // function.
      if ((className == '[object Function]' ||
          typeof value.call != 'undefined' &&
          typeof value.propertyIsEnumerable != 'undefined' &&
          !value.propertyIsEnumerable('call'))) {
        return 'function';
      }


    } else {
      return 'null';
    }

  } else if (s == 'function' && typeof value.call == 'undefined') {
    // In Safari typeof nodeList returns 'function', and on Firefox
    // typeof behaves similarly for HTML{Applet,Embed,Object}Elements
    // and RegExps.  We would like to return object for those and we can
    // detect an invalid function by making sure that the function
    // object has a call method.
    return 'object';
  }
  return s;
};


/**
 * Returns true if the specified value is not |undefined|.
 * WARNING: Do not use this to test if an object has a property. Use the in
 * operator instead.  Additionally, this function assumes that the global
 * undefined variable has not been redefined.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined.
 */
goog.isDef = function(val) {
  return val !== undefined;
};


/**
 * Returns true if the specified value is |null|
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is null.
 */
goog.isNull = function(val) {
  return val === null;
};


/**
 * Returns true if the specified value is defined and not null
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined and not null.
 */
goog.isDefAndNotNull = function(val) {
  // Note that undefined == null.
  return val != null;
};


/**
 * Returns true if the specified value is an array
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArray = function(val) {
  return goog.typeOf(val) == 'array';
};


/**
 * Returns true if the object looks like an array. To qualify as array like
 * the value needs to be either a NodeList or an object with a Number length
 * property.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == 'array' || type == 'object' && typeof val.length == 'number';
};


/**
 * Returns true if the object looks like a Date. To qualify as Date-like
 * the value needs to be an object and have a getFullYear() function.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a like a Date.
 */
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == 'function';
};


/**
 * Returns true if the specified value is a string
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a string.
 */
goog.isString = function(val) {
  return typeof val == 'string';
};


/**
 * Returns true if the specified value is a boolean
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is boolean.
 */
goog.isBoolean = function(val) {
  return typeof val == 'boolean';
};


/**
 * Returns true if the specified value is a number
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a number.
 */
goog.isNumber = function(val) {
  return typeof val == 'number';
};


/**
 * Returns true if the specified value is a function
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a function.
 */
goog.isFunction = function(val) {
  return goog.typeOf(val) == 'function';
};


/**
 * Returns true if the specified value is an object.  This includes arrays
 * and functions.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an object.
 */
goog.isObject = function(val) {
  var type = typeof val;
  return type == 'object' && val != null || type == 'function';
  // return Object(val) === val also works, but is slower, especially if val is
  // not an object.
};


/**
 * Gets a unique ID for an object. This mutates the object so that further
 * calls with the same object as a parameter returns the same value. The unique
 * ID is guaranteed to be unique across the current session amongst objects that
 * are passed into {@code getUid}. There is no guarantee that the ID is unique
 * or consistent across sessions. It is unsafe to generate unique ID for
 * function prototypes.
 *
 * @param {Object} obj The object to get the unique ID for.
 * @return {number} The unique ID for the object.
 */
goog.getUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // In Opera window.hasOwnProperty exists but always returns false so we avoid
  // using it. As a consequence the unique ID generated for BaseClass.prototype
  // and SubClass.prototype will be the same.
  return obj[goog.UID_PROPERTY_] ||
      (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};


/**
 * Removes the unique ID from an object. This is useful if the object was
 * previously mutated using {@code goog.getUid} in which case the mutation is
 * undone.
 * @param {Object} obj The object to remove the unique ID field from.
 */
goog.removeUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // DOM nodes in IE are not instance of Object and throws exception
  // for delete. Instead we try to use removeAttribute
  if ('removeAttribute' in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_);
  }
  /** @preserveTry */
  try {
    delete obj[goog.UID_PROPERTY_];
  } catch (ex) {
  }
};


/**
 * Name for unique ID property. Initialized in a way to help avoid collisions
 * with other closure javascript on the same page.
 * @type {string}
 * @private
 */
goog.UID_PROPERTY_ = 'closure_uid_' +
    Math.floor(Math.random() * 2147483648).toString(36);


/**
 * Counter for UID.
 * @type {number}
 * @private
 */
goog.uidCounter_ = 0;


/**
 * Adds a hash code field to an object. The hash code is unique for the
 * given object.
 * @param {Object} obj The object to get the hash code for.
 * @return {number} The hash code for the object.
 * @deprecated Use goog.getUid instead.
 */
goog.getHashCode = goog.getUid;


/**
 * Removes the hash code field from an object.
 * @param {Object} obj The object to remove the field from.
 * @deprecated Use goog.removeUid instead.
 */
goog.removeHashCode = goog.removeUid;


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.cloneObject</code> does not detect reference loops. Objects that
 * refer to themselves will cause infinite recursion.
 *
 * <code>goog.cloneObject</code> is unaware of unique identifiers, and copies
 * UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 * @deprecated goog.cloneObject is unsafe. Prefer the goog.object methods.
 */
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.cloneObject(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * Forward declaration for the clone method. This is necessary until the
 * compiler can better support duck-typing constructs as used in
 * goog.cloneObject.
 *
 * TODO(brenneman): Remove once the JSCompiler can infer that the check for
 * proto.clone is safe in goog.cloneObject.
 *
 * @type {Function}
 */
Object.prototype.clone;


/**
 * A native implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 * @suppress {deprecated} The compiler thinks that Function.prototype.bind
 *     is deprecated because some people have declared a pure-JS version.
 *     Only the pure-JS version is truly deprecated.
 */
goog.bindNative_ = function(fn, selfObj, var_args) {
  return /** @type {!Function} */ (fn.call.apply(fn.bind, arguments));
};


/**
 * A pure-JS implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 */
goog.bindJs_ = function(fn, selfObj, var_args) {
  if (!fn) {
    throw new Error();
  }

  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs);
    };

  } else {
    return function() {
      return fn.apply(selfObj, arguments);
    };
  }
};


/**
 * Partially applies this function to a particular 'this object' and zero or
 * more arguments. The result is a new function with some arguments of the first
 * function pre-filled and the value of |this| 'pre-specified'.<br><br>
 *
 * Remaining arguments specified at call-time are appended to the pre-
 * specified ones.<br><br>
 *
 * Also see: {@link #partial}.<br><br>
 *
 * Usage:
 * <pre>var barMethBound = bind(myFunction, myObj, 'arg1', 'arg2');
 * barMethBound('arg3', 'arg4');</pre>
 *
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @suppress {deprecated} See above.
 */
goog.bind = function(fn, selfObj, var_args) {
  // TODO(nicksantos): narrow the type signature.
  if (Function.prototype.bind &&
      // NOTE(nicksantos): Somebody pulled base.js into the default
      // Chrome extension environment. This means that for Chrome extensions,
      // they get the implementation of Function.prototype.bind that
      // calls goog.bind instead of the native one. Even worse, we don't want
      // to introduce a circular dependency between goog.bind and
      // Function.prototype.bind, so we have to hack this to make sure it
      // works correctly.
      Function.prototype.bind.toString().indexOf('native code') != -1) {
    goog.bind = goog.bindNative_;
  } else {
    goog.bind = goog.bindJs_;
  }
  return goog.bind.apply(null, arguments);
};


/**
 * Like bind(), except that a 'this object' is not required. Useful when the
 * target function is already bound.
 *
 * Usage:
 * var g = partial(f, arg1, arg2);
 * g(arg3, arg4);
 *
 * @param {Function} fn A function to partially apply.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to fn.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 */
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    // Prepend the bound arguments to the current arguments.
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs);
  };
};


/**
 * Copies all the members of a source object to a target object. This method
 * does not work on all browsers for all objects that contain keys such as
 * toString or hasOwnProperty. Use goog.object.extend for this purpose.
 * @param {Object} target Target.
 * @param {Object} source Source.
 */
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }

  // For IE7 or lower, the for-in-loop does not contain any properties that are
  // not enumerable on the prototype object (for example, isPrototypeOf from
  // Object.prototype) but also it will not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
};


/**
 * @return {number} An integer value representing the number of milliseconds
 *     between midnight, January 1, 1970 and the current time.
 */
goog.now = Date.now || (function() {
  // Unary plus operator converts its operand to a number which in the case of
  // a date is done by calling getTime().
  return +new Date();
});


/**
 * Evals javascript in the global scope.  In IE this uses execScript, other
 * browsers use goog.global.eval. If goog.global.eval does not evaluate in the
 * global scope (for example, in Safari), appends a script tag instead.
 * Throws an exception if neither execScript or eval is defined.
 * @param {string} script JavaScript string.
 */
goog.globalEval = function(script) {
  if (goog.global.execScript) {
    goog.global.execScript(script, 'JavaScript');
  } else if (goog.global.eval) {
    // Test to see if eval works
    if (goog.evalWorksForGlobals_ == null) {
      goog.global.eval('var _et_ = 1;');
      if (typeof goog.global['_et_'] != 'undefined') {
        delete goog.global['_et_'];
        goog.evalWorksForGlobals_ = true;
      } else {
        goog.evalWorksForGlobals_ = false;
      }
    }

    if (goog.evalWorksForGlobals_) {
      goog.global.eval(script);
    } else {
      var doc = goog.global.document;
      var scriptElt = doc.createElement('script');
      scriptElt.type = 'text/javascript';
      scriptElt.defer = false;
      // Note(user): can't use .innerHTML since "t('<test>')" will fail and
      // .text doesn't work in Safari 2.  Therefore we append a text node.
      scriptElt.appendChild(doc.createTextNode(script));
      doc.body.appendChild(scriptElt);
      doc.body.removeChild(scriptElt);
    }
  } else {
    throw Error('goog.globalEval not available');
  }
};


/**
 * Indicates whether or not we can call 'eval' directly to eval code in the
 * global scope. Set to a Boolean by the first call to goog.globalEval (which
 * empirically tests whether eval works for globals). @see goog.globalEval
 * @type {?boolean}
 * @private
 */
goog.evalWorksForGlobals_ = null;


/**
 * Optional map of CSS class names to obfuscated names used with
 * goog.getCssName().
 * @type {Object|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMapping_;


/**
 * Optional obfuscation style for CSS class names. Should be set to either
 * 'BY_WHOLE' or 'BY_PART' if defined.
 * @type {string|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMappingStyle_;


/**
 * Handles strings that are intended to be used as CSS class names.
 *
 * This function works in tandem with @see goog.setCssNameMapping.
 *
 * Without any mapping set, the arguments are simple joined with a
 * hyphen and passed through unaltered.
 *
 * When there is a mapping, there are two possible styles in which
 * these mappings are used. In the BY_PART style, each part (i.e. in
 * between hyphens) of the passed in css name is rewritten according
 * to the map. In the BY_WHOLE style, the full css name is looked up in
 * the map directly. If a rewrite is not specified by the map, the
 * compiler will output a warning.
 *
 * When the mapping is passed to the compiler, it will replace calls
 * to goog.getCssName with the strings from the mapping, e.g.
 *     var x = goog.getCssName('foo');
 *     var y = goog.getCssName(this.baseClass, 'active');
 *  becomes:
 *     var x= 'foo';
 *     var y = this.baseClass + '-active';
 *
 * If one argument is passed it will be processed, if two are passed
 * only the modifier will be processed, as it is assumed the first
 * argument was generated as a result of calling goog.getCssName.
 *
 * @param {string} className The class name.
 * @param {string=} opt_modifier A modifier to be appended to the class name.
 * @return {string} The class name or the concatenation of the class name and
 *     the modifier.
 */
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName;
  };

  var renameByParts = function(cssName) {
    // Remap all the parts individually.
    var parts = cssName.split('-');
    var mapped = [];
    for (var i = 0; i < parts.length; i++) {
      mapped.push(getMapping(parts[i]));
    }
    return mapped.join('-');
  };

  var rename;
  if (goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == 'BY_WHOLE' ?
        getMapping : renameByParts;
  } else {
    rename = function(a) {
      return a;
    };
  }

  if (opt_modifier) {
    return className + '-' + rename(opt_modifier);
  } else {
    return rename(className);
  }
};


/**
 * Sets the map to check when returning a value from goog.getCssName(). Example:
 * <pre>
 * goog.setCssNameMapping({
 *   "goog": "a",
 *   "disabled": "b",
 * });
 *
 * var x = goog.getCssName('goog');
 * // The following evaluates to: "a a-b".
 * goog.getCssName('goog') + ' ' + goog.getCssName(x, 'disabled')
 * </pre>
 * When declared as a map of string literals to string literals, the JSCompiler
 * will replace all calls to goog.getCssName() using the supplied map if the
 * --closure_pass flag is set.
 *
 * @param {!Object} mapping A map of strings to strings where keys are possible
 *     arguments to goog.getCssName() and values are the corresponding values
 *     that should be returned.
 * @param {string=} opt_style The style of css name mapping. There are two valid
 *     options: 'BY_PART', and 'BY_WHOLE'.
 * @see goog.getCssName for a description.
 */
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style;
};


/**
 * To use CSS renaming in compiled mode, one of the input files should have a
 * call to goog.setCssNameMapping() with an object literal that the JSCompiler
 * can extract and use to replace all calls to goog.getCssName(). In uncompiled
 * mode, JavaScript code should be loaded before this base.js file that declares
 * a global variable, CLOSURE_CSS_NAME_MAPPING, which is used below. This is
 * to ensure that the mapping is loaded before any calls to goog.getCssName()
 * are made in uncompiled mode.
 *
 * A hook for overriding the CSS name mapping.
 * @type {Object|undefined}
 */
goog.global.CLOSURE_CSS_NAME_MAPPING;


if (!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  // This does not call goog.setCssNameMapping() because the JSCompiler
  // requires that goog.setCssNameMapping() be called with an object literal.
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING;
}


/**
 * Abstract implementation of goog.getMsg for use with localized messages.
 * @param {string} str Translatable string, places holders in the form {$foo}.
 * @param {Object=} opt_values Map of place holder name to value.
 * @return {string} message with placeholders filled.
 */
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for (var key in values) {
    var value = ('' + values[key]).replace(/\$/g, '$$$$');
    str = str.replace(new RegExp('\\{\\$' + key + '\\}', 'gi'), value);
  }
  return str;
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated,
 * unless they are exported in turn via this function or
 * goog.exportProperty
 *
 * <p>Also handy for making public items that are defined in anonymous
 * closures.
 *
 * ex. goog.exportSymbol('Foo', Foo);
 *
 * ex. goog.exportSymbol('public.path.Foo.staticFunction',
 *                       Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. goog.exportSymbol('public.path.Foo.prototype.myMethod',
 *                       Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {*} object Object the name should point to.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 */
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo);
};


/**
 * Exports a property unobfuscated into the object's namespace.
 * ex. goog.exportProperty(Foo, 'staticFunction', Foo.staticFunction);
 * ex. goog.exportProperty(Foo.prototype, 'myMethod', Foo.prototype.myMethod);
 * @param {Object} object Object whose static property is being exported.
 * @param {string} publicName Unobfuscated name to export.
 * @param {*} symbol Object the name should point to.
 */
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   goog.base(this, a, b);
 * }
 * goog.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 * </pre>
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * <pre>
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.superClass_.foo.call(this, a);
 *   // other code
 * };
 * </pre>
 *
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
goog.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};


/**
 * Call up to the superclass.
 *
 * If this is called from a constructor, then this calls the superclass
 * contructor with arguments 1-N.
 *
 * If this is called from a prototype method, then you must pass
 * the name of the method as the second argument to this function. If
 * you do not, you will get a runtime error. This calls the superclass'
 * method with arguments 2-N.
 *
 * This function only works if you use goog.inherits to express
 * inheritance relationships between your classes.
 *
 * This function is a compiler primitive. At compile-time, the
 * compiler will do macro expansion to remove a lot of
 * the extra overhead that this function introduces. The compiler
 * will also enforce a lot of the assumptions that this function
 * makes, and treat it as a compiler error if you break them.
 *
 * @param {!Object} me Should always be "this".
 * @param {*=} opt_methodName The method name if calling a super method.
 * @param {...*} var_args The rest of the arguments.
 * @return {*} The return value of the superclass method.
 */
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if (caller.superClass_) {
    // This is a constructor. Call the superclass constructor.
    return caller.superClass_.constructor.apply(
        me, Array.prototype.slice.call(arguments, 1));
  }

  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for (var ctor = me.constructor;
       ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if (ctor.prototype[opt_methodName] === caller) {
      foundCaller = true;
    } else if (foundCaller) {
      return ctor.prototype[opt_methodName].apply(me, args);
    }
  }

  // If we did not find the caller in the prototype chain,
  // then one of two things happened:
  // 1) The caller is an instance method.
  // 2) This method was not called by the right caller.
  if (me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args);
  } else {
    throw Error(
        'goog.base called from a method of one name ' +
        'to a method of a different name');
  }
};


/**
 * Allow for aliasing within scope functions.  This function exists for
 * uncompiled code - in compiled code the calls will be inlined and the
 * aliases applied.  In uncompiled code the function is simply run since the
 * aliases as written are valid JavaScript.
 * @param {function()} fn Function to call.  This function can contain aliases
 *     to namespaces (e.g. "var dom = goog.dom") or classes
 *    (e.g. "var Timer = goog.Timer").
 */
goog.scope = function(fn) {
  fn.call(goog.global);
};


goog.addDependency("/array/array.js", ["goog.array", "goog.array.ArrayLike"], ["goog.asserts"]);
goog.addDependency("/asserts/asserts.js", ["goog.asserts", "goog.asserts.AssertionError"], ["goog.debug.Error", "goog.string"]);
goog.addDependency("/async/conditionaldelay.js", ["goog.async.ConditionalDelay"], ["goog.Disposable", "goog.async.Delay"]);
goog.addDependency("/async/delay.js", ["goog.Delay", "goog.async.Delay"], ["goog.Disposable", "goog.Timer"]);
goog.addDependency("/async/throttle.js", ["goog.Throttle", "goog.async.Throttle"], ["goog.Disposable", "goog.Timer"]);
goog.addDependency("/base.js", [], []);
goog.addDependency("/bootstrap/webworkers.js", [], []);
goog.addDependency("/color/alpha.js", ["goog.color.alpha"], ["goog.color"]);
goog.addDependency("/color/color.js", ["goog.color"], ["goog.color.names", "goog.math"]);
goog.addDependency("/color/names.js", ["goog.color.names"], []);
goog.addDependency("/crypt/arc4.js", ["goog.crypt.Arc4"], ["goog.asserts"]);
goog.addDependency("/crypt/base64.js", ["goog.crypt.base64"], ["goog.crypt", "goog.userAgent"]);
goog.addDependency("/crypt/basen.js", ["goog.crypt.baseN"], []);
goog.addDependency("/crypt/blobhasher.js", ["goog.crypt.BlobHasher", "goog.crypt.BlobHasher.EventType"], ["goog.asserts", "goog.crypt", "goog.crypt.Hash", "goog.debug.Logger", "goog.events.EventTarget", "goog.fs"]);
goog.addDependency("/crypt/crypt.js", ["goog.crypt"], ["goog.array"]);
goog.addDependency("/crypt/hash.js", ["goog.crypt.Hash"], []);
goog.addDependency("/crypt/hash32.js", ["goog.crypt.hash32"], ["goog.crypt"]);
goog.addDependency("/crypt/hash_test.js", ["goog.crypt.hash_test"], ["goog.testing.asserts"]);
goog.addDependency("/crypt/hmac.js", ["goog.crypt.Hmac"], ["goog.asserts", "goog.crypt.Hash"]);
goog.addDependency("/crypt/md5.js", ["goog.crypt.Md5"], ["goog.crypt.Hash"]);
goog.addDependency("/crypt/sha1.js", ["goog.crypt.Sha1"], ["goog.crypt.Hash"]);
goog.addDependency("/cssom/cssom.js", ["goog.cssom", "goog.cssom.CssRuleType"], ["goog.array", "goog.dom"]);
goog.addDependency("/cssom/iframe/style.js", ["goog.cssom.iframe.style"], ["goog.cssom", "goog.dom", "goog.dom.NodeType", "goog.dom.classes", "goog.string", "goog.style", "goog.userAgent"]);
goog.addDependency("/datasource/datamanager.js", ["goog.ds.DataManager"], ["goog.ds.BasicNodeList", "goog.ds.DataNode", "goog.ds.Expr", "goog.string", "goog.structs", "goog.structs.Map"]);
goog.addDependency("/datasource/datasource.js", ["goog.ds.BaseDataNode", "goog.ds.BasicNodeList", "goog.ds.DataNode", "goog.ds.DataNodeList", "goog.ds.EmptyNodeList", "goog.ds.LoadState", "goog.ds.SortedNodeList", "goog.ds.Util", "goog.ds.logger"], ["goog.array", "goog.debug.Logger"]);
goog.addDependency("/datasource/expr.js", ["goog.ds.Expr"], ["goog.ds.BasicNodeList", "goog.ds.EmptyNodeList", "goog.string"]);
goog.addDependency("/datasource/fastdatanode.js", ["goog.ds.AbstractFastDataNode", "goog.ds.FastDataNode", "goog.ds.FastListNode", "goog.ds.PrimitiveFastDataNode"], ["goog.ds.DataManager", "goog.ds.EmptyNodeList", "goog.string"]);
goog.addDependency("/datasource/jsdatasource.js", ["goog.ds.JsDataSource", "goog.ds.JsPropertyDataSource"], ["goog.ds.BaseDataNode", "goog.ds.BasicNodeList", "goog.ds.DataManager", "goog.ds.EmptyNodeList", "goog.ds.LoadState"]);
goog.addDependency("/datasource/jsondatasource.js", ["goog.ds.JsonDataSource"], ["goog.Uri", "goog.dom", "goog.ds.DataManager", "goog.ds.JsDataSource", "goog.ds.LoadState", "goog.ds.logger"]);
goog.addDependency("/datasource/jsxmlhttpdatasource.js", ["goog.ds.JsXmlHttpDataSource"], ["goog.Uri", "goog.ds.DataManager", "goog.ds.FastDataNode", "goog.ds.LoadState", "goog.ds.logger", "goog.events", "goog.net.EventType", "goog.net.XhrIo"]);
goog.addDependency("/datasource/xmldatasource.js", ["goog.ds.XmlDataSource", "goog.ds.XmlHttpDataSource"], ["goog.Uri", "goog.dom.NodeType", "goog.dom.xml", "goog.ds.BasicNodeList", "goog.ds.DataManager", "goog.ds.LoadState", "goog.ds.logger", "goog.net.XhrIo", "goog.string"]);
goog.addDependency("/date/date.js", ["goog.date", "goog.date.Date", "goog.date.DateTime", "goog.date.Interval", "goog.date.month", "goog.date.weekDay"], ["goog.asserts", "goog.date.DateLike", "goog.i18n.DateTimeSymbols", "goog.string"]);
goog.addDependency("/date/datelike.js", ["goog.date.DateLike"], []);
goog.addDependency("/date/daterange.js", ["goog.date.DateRange", "goog.date.DateRange.Iterator", "goog.date.DateRange.StandardDateRangeKeys"], ["goog.date.Date", "goog.date.Interval", "goog.iter.Iterator", "goog.iter.StopIteration"]);
goog.addDependency("/date/relative.js", ["goog.date.relative"], ["goog.i18n.DateTimeFormat"]);
goog.addDependency("/date/utcdatetime.js", ["goog.date.UtcDateTime"], ["goog.date", "goog.date.Date", "goog.date.DateTime", "goog.date.Interval"]);
goog.addDependency("/db/db.js", ["goog.db"], ["goog.async.Deferred", "goog.db.Error", "goog.db.IndexedDb"]);
goog.addDependency("/db/error.js", ["goog.db.Error", "goog.db.Error.ErrorCode", "goog.db.Error.VersionChangeBlockedError"], ["goog.debug.Error"]);
goog.addDependency("/db/index.js", ["goog.db.Index"], ["goog.async.Deferred", "goog.db.Error", "goog.debug"]);
goog.addDependency("/db/indexeddb.js", ["goog.db.IndexedDb"], ["goog.async.Deferred", "goog.db.Error", "goog.db.Error.VersionChangeBlockedError", "goog.db.ObjectStore", "goog.db.Transaction", "goog.db.Transaction.TransactionMode"]);
goog.addDependency("/db/objectstore.js", ["goog.db.ObjectStore"], ["goog.async.Deferred", "goog.db.Error", "goog.db.Index", "goog.debug"]);
goog.addDependency("/db/transaction.js", ["goog.db.Transaction", "goog.db.Transaction.TransactionMode"], ["goog.db.Error", "goog.db.ObjectStore", "goog.events.EventHandler", "goog.events.EventTarget"]);
goog.addDependency("/debug/console.js", ["goog.debug.Console"], ["goog.debug.LogManager", "goog.debug.Logger.Level", "goog.debug.TextFormatter"]);
goog.addDependency("/debug/debug.js", ["goog.debug"], ["goog.array", "goog.string", "goog.structs.Set", "goog.userAgent"]);
goog.addDependency("/debug/debugwindow.js", ["goog.debug.DebugWindow"], ["goog.debug.HtmlFormatter", "goog.debug.LogManager", "goog.structs.CircularBuffer", "goog.userAgent"]);
goog.addDependency("/debug/devcss/devcss.js", ["goog.debug.DevCss", "goog.debug.DevCss.UserAgent"], ["goog.cssom", "goog.dom.classes", "goog.events", "goog.events.EventType", "goog.string", "goog.userAgent"]);
goog.addDependency("/debug/devcss/devcssrunner.js", ["goog.debug.devCssRunner"], ["goog.debug.DevCss"]);
goog.addDependency("/debug/divconsole.js", ["goog.debug.DivConsole"], ["goog.debug.HtmlFormatter", "goog.debug.LogManager", "goog.style"]);
goog.addDependency("/debug/entrypointregistry.js", ["goog.debug.EntryPointMonitor", "goog.debug.entryPointRegistry"], ["goog.asserts"]);
goog.addDependency("/debug/error.js", ["goog.debug.Error"], []);
goog.addDependency("/debug/errorhandler.js", ["goog.debug.ErrorHandler", "goog.debug.ErrorHandler.ProtectedFunctionError"], ["goog.asserts", "goog.debug", "goog.debug.EntryPointMonitor", "goog.debug.Trace"]);
goog.addDependency("/debug/errorhandlerweakdep.js", ["goog.debug.errorHandlerWeakDep"], []);
goog.addDependency("/debug/errorreporter.js", ["goog.debug.ErrorReporter", "goog.debug.ErrorReporter.ExceptionEvent"], ["goog.debug", "goog.debug.ErrorHandler", "goog.debug.Logger", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.net.XhrIo", "goog.object", "goog.string", "goog.uri.utils"]);
goog.addDependency("/debug/fancywindow.js", ["goog.debug.FancyWindow"], ["goog.debug.DebugWindow", "goog.debug.LogManager", "goog.debug.Logger", "goog.debug.Logger.Level", "goog.dom.DomHelper", "goog.object", "goog.string", "goog.userAgent"]);
goog.addDependency("/debug/formatter.js", ["goog.debug.Formatter", "goog.debug.HtmlFormatter", "goog.debug.TextFormatter"], ["goog.debug.RelativeTimeProvider", "goog.string"]);
goog.addDependency("/debug/fpsdisplay.js", ["goog.debug.FpsDisplay"], ["goog.asserts", "goog.fx.anim", "goog.ui.Component"]);
goog.addDependency("/debug/gcdiagnostics.js", ["goog.debug.GcDiagnostics"], ["goog.debug.Logger", "goog.debug.Trace", "goog.userAgent"]);
goog.addDependency("/debug/logbuffer.js", ["goog.debug.LogBuffer"], ["goog.asserts", "goog.debug.LogRecord"]);
goog.addDependency("/debug/logger.js", ["goog.debug.LogManager", "goog.debug.Logger", "goog.debug.Logger.Level"], ["goog.array", "goog.asserts", "goog.debug", "goog.debug.LogBuffer", "goog.debug.LogRecord"]);
goog.addDependency("/debug/logrecord.js", ["goog.debug.LogRecord"], []);
goog.addDependency("/debug/logrecordserializer.js", ["goog.debug.logRecordSerializer"], ["goog.debug.LogRecord", "goog.debug.Logger.Level", "goog.json", "goog.object"]);
goog.addDependency("/debug/reflect.js", ["goog.debug.reflect"], []);
goog.addDependency("/debug/relativetimeprovider.js", ["goog.debug.RelativeTimeProvider"], []);
goog.addDependency("/debug/tracer.js", ["goog.debug.Trace"], ["goog.array", "goog.debug.Logger", "goog.iter", "goog.structs.Map", "goog.structs.SimplePool"]);
goog.addDependency("/demos/autocompleteremotedata.js", [], []);
goog.addDependency("/demos/autocompleterichremotedata.js", [], []);
goog.addDependency("/demos/editor/deps.js", [], []);
goog.addDependency("/demos/editor/equationeditor.js", ["goog.demos.editor.EquationEditor"], ["goog.ui.equation.EquationEditorDialog"]);
goog.addDependency("/demos/editor/helloworld.js", ["goog.demos.editor.HelloWorld"], ["goog.dom", "goog.dom.TagName", "goog.editor.Plugin"]);
goog.addDependency("/demos/editor/helloworlddialog.js", ["goog.demos.editor.HelloWorldDialog", "goog.demos.editor.HelloWorldDialog.OkEvent"], ["goog.dom.TagName", "goog.events.Event", "goog.string", "goog.ui.editor.AbstractDialog", "goog.ui.editor.AbstractDialog.Builder", "goog.ui.editor.AbstractDialog.EventType"]);
goog.addDependency("/demos/editor/helloworlddialogplugin.js", ["goog.demos.editor.HelloWorldDialogPlugin", "goog.demos.editor.HelloWorldDialogPlugin.Command"], ["goog.demos.editor.HelloWorldDialog", "goog.dom.TagName", "goog.editor.plugins.AbstractDialogPlugin", "goog.editor.range", "goog.functions", "goog.ui.editor.AbstractDialog.EventType"]);
goog.addDependency("/demos/graphics/tigerdata.js", [], []);
goog.addDependency("/demos/samplecomponent.js", ["goog.demos.SampleComponent"], ["goog.dom", "goog.dom.classes", "goog.events.EventHandler", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.ui.Component"]);
goog.addDependency("/demos/tree/testdata.js", [], []);
goog.addDependency("/demos/xpc/xpcdemo.js", [], ["goog.Uri", "goog.debug.Logger", "goog.dom", "goog.events", "goog.events.EventType", "goog.json", "goog.net.xpc.CrossPageChannel"]);
goog.addDependency("/deps.js", [], []);
goog.addDependency("/disposable/disposable.js", ["goog.Disposable", "goog.dispose"], ["goog.disposable.IDisposable"]);
goog.addDependency("/disposable/idisposable.js", ["goog.disposable.IDisposable"], []);
goog.addDependency("/dom/a11y.js", ["goog.dom.a11y", "goog.dom.a11y.Announcer", "goog.dom.a11y.LivePriority", "goog.dom.a11y.Role", "goog.dom.a11y.State"], ["goog.Disposable", "goog.dom", "goog.object"]);
goog.addDependency("/dom/abstractmultirange.js", ["goog.dom.AbstractMultiRange"], ["goog.array", "goog.dom", "goog.dom.AbstractRange"]);
goog.addDependency("/dom/abstractrange.js", ["goog.dom.AbstractRange", "goog.dom.RangeIterator", "goog.dom.RangeType"], ["goog.dom", "goog.dom.NodeType", "goog.dom.SavedCaretRange", "goog.dom.TagIterator", "goog.userAgent"]);
goog.addDependency("/dom/annotate.js", ["goog.dom.annotate"], ["goog.array", "goog.dom", "goog.dom.NodeType", "goog.string"]);
goog.addDependency("/dom/browserfeature.js", ["goog.dom.BrowserFeature"], ["goog.userAgent"]);
goog.addDependency("/dom/browserrange/abstractrange.js", ["goog.dom.browserrange.AbstractRange"], ["goog.dom", "goog.dom.NodeType", "goog.dom.RangeEndpoint", "goog.dom.TagName", "goog.dom.TextRangeIterator", "goog.iter", "goog.string", "goog.string.StringBuffer", "goog.userAgent"]);
goog.addDependency("/dom/browserrange/browserrange.js", ["goog.dom.browserrange", "goog.dom.browserrange.Error"], ["goog.dom", "goog.dom.browserrange.GeckoRange", "goog.dom.browserrange.IeRange", "goog.dom.browserrange.OperaRange", "goog.dom.browserrange.W3cRange", "goog.dom.browserrange.WebKitRange", "goog.userAgent"]);
goog.addDependency("/dom/browserrange/geckorange.js", ["goog.dom.browserrange.GeckoRange"], ["goog.dom.browserrange.W3cRange"]);
goog.addDependency("/dom/browserrange/ierange.js", ["goog.dom.browserrange.IeRange"], ["goog.array", "goog.debug.Logger", "goog.dom", "goog.dom.NodeIterator", "goog.dom.NodeType", "goog.dom.RangeEndpoint", "goog.dom.TagName", "goog.dom.browserrange.AbstractRange", "goog.iter", "goog.iter.StopIteration", "goog.string"]);
goog.addDependency("/dom/browserrange/operarange.js", ["goog.dom.browserrange.OperaRange"], ["goog.dom.browserrange.W3cRange"]);
goog.addDependency("/dom/browserrange/w3crange.js", ["goog.dom.browserrange.W3cRange"], ["goog.dom", "goog.dom.NodeType", "goog.dom.RangeEndpoint", "goog.dom.browserrange.AbstractRange", "goog.string"]);
goog.addDependency("/dom/browserrange/webkitrange.js", ["goog.dom.browserrange.WebKitRange"], ["goog.dom.RangeEndpoint", "goog.dom.browserrange.W3cRange", "goog.userAgent"]);
goog.addDependency("/dom/classes.js", ["goog.dom.classes"], ["goog.array"]);
goog.addDependency("/dom/controlrange.js", ["goog.dom.ControlRange", "goog.dom.ControlRangeIterator"], ["goog.array", "goog.dom", "goog.dom.AbstractMultiRange", "goog.dom.AbstractRange", "goog.dom.RangeIterator", "goog.dom.RangeType", "goog.dom.SavedRange", "goog.dom.TagWalkType", "goog.dom.TextRange", "goog.iter.StopIteration", "goog.userAgent"]);
goog.addDependency("/dom/dataset.js", ["goog.dom.dataset"], ["goog.string"]);
goog.addDependency("/dom/dom.js", ["goog.dom", "goog.dom.DomHelper", "goog.dom.NodeType"], ["goog.array", "goog.dom.BrowserFeature", "goog.dom.TagName", "goog.dom.classes", "goog.math.Coordinate", "goog.math.Size", "goog.object", "goog.string", "goog.userAgent"]);
goog.addDependency("/dom/dom_test.js", ["goog.dom.dom_test"], ["goog.dom", "goog.dom.DomHelper", "goog.dom.NodeType", "goog.dom.TagName", "goog.testing.asserts", "goog.userAgent", "goog.userAgent.product", "goog.userAgent.product.isVersion"]);
goog.addDependency("/dom/fontsizemonitor.js", ["goog.dom.FontSizeMonitor", "goog.dom.FontSizeMonitor.EventType"], ["goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.userAgent"]);
goog.addDependency("/dom/forms.js", ["goog.dom.forms"], ["goog.structs.Map"]);
goog.addDependency("/dom/iframe.js", ["goog.dom.iframe"], ["goog.dom"]);
goog.addDependency("/dom/iter.js", ["goog.dom.iter.AncestorIterator", "goog.dom.iter.ChildIterator", "goog.dom.iter.SiblingIterator"], ["goog.iter.Iterator", "goog.iter.StopIteration"]);
goog.addDependency("/dom/multirange.js", ["goog.dom.MultiRange", "goog.dom.MultiRangeIterator"], ["goog.array", "goog.debug.Logger", "goog.dom.AbstractMultiRange", "goog.dom.AbstractRange", "goog.dom.RangeIterator", "goog.dom.RangeType", "goog.dom.SavedRange", "goog.dom.TextRange", "goog.iter.StopIteration"]);
goog.addDependency("/dom/nodeiterator.js", ["goog.dom.NodeIterator"], ["goog.dom.TagIterator"]);
goog.addDependency("/dom/nodeoffset.js", ["goog.dom.NodeOffset"], ["goog.Disposable", "goog.dom.TagName"]);
goog.addDependency("/dom/pattern/abstractpattern.js", ["goog.dom.pattern.AbstractPattern"], ["goog.dom.pattern.MatchType"]);
goog.addDependency("/dom/pattern/allchildren.js", ["goog.dom.pattern.AllChildren"], ["goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/dom/pattern/callback/callback.js", ["goog.dom.pattern.callback"], ["goog.dom", "goog.dom.TagWalkType", "goog.iter"]);
goog.addDependency("/dom/pattern/callback/counter.js", ["goog.dom.pattern.callback.Counter"], []);
goog.addDependency("/dom/pattern/callback/test.js", ["goog.dom.pattern.callback.Test"], ["goog.iter.StopIteration"]);
goog.addDependency("/dom/pattern/childmatches.js", ["goog.dom.pattern.ChildMatches"], ["goog.dom.pattern.AllChildren", "goog.dom.pattern.MatchType"]);
goog.addDependency("/dom/pattern/endtag.js", ["goog.dom.pattern.EndTag"], ["goog.dom.TagWalkType", "goog.dom.pattern.Tag"]);
goog.addDependency("/dom/pattern/fulltag.js", ["goog.dom.pattern.FullTag"], ["goog.dom.pattern.MatchType", "goog.dom.pattern.StartTag", "goog.dom.pattern.Tag"]);
goog.addDependency("/dom/pattern/matcher.js", ["goog.dom.pattern.Matcher"], ["goog.dom.TagIterator", "goog.dom.pattern.MatchType", "goog.iter"]);
goog.addDependency("/dom/pattern/nodetype.js", ["goog.dom.pattern.NodeType"], ["goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/dom/pattern/pattern.js", ["goog.dom.pattern", "goog.dom.pattern.MatchType"], []);
goog.addDependency("/dom/pattern/repeat.js", ["goog.dom.pattern.Repeat"], ["goog.dom.NodeType", "goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/dom/pattern/sequence.js", ["goog.dom.pattern.Sequence"], ["goog.dom.NodeType", "goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/dom/pattern/starttag.js", ["goog.dom.pattern.StartTag"], ["goog.dom.TagWalkType", "goog.dom.pattern.Tag"]);
goog.addDependency("/dom/pattern/tag.js", ["goog.dom.pattern.Tag"], ["goog.dom.pattern", "goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType", "goog.object"]);
goog.addDependency("/dom/pattern/text.js", ["goog.dom.pattern.Text"], ["goog.dom.NodeType", "goog.dom.pattern", "goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/dom/range.js", ["goog.dom.Range"], ["goog.dom", "goog.dom.AbstractRange", "goog.dom.ControlRange", "goog.dom.MultiRange", "goog.dom.NodeType", "goog.dom.TextRange", "goog.userAgent"]);
goog.addDependency("/dom/rangeendpoint.js", ["goog.dom.RangeEndpoint"], []);
goog.addDependency("/dom/savedcaretrange.js", ["goog.dom.SavedCaretRange"], ["goog.array", "goog.dom", "goog.dom.SavedRange", "goog.dom.TagName", "goog.string"]);
goog.addDependency("/dom/savedrange.js", ["goog.dom.SavedRange"], ["goog.Disposable", "goog.debug.Logger"]);
goog.addDependency("/dom/selection.js", ["goog.dom.selection"], ["goog.string", "goog.userAgent"]);
goog.addDependency("/dom/tagiterator.js", ["goog.dom.TagIterator", "goog.dom.TagWalkType"], ["goog.dom.NodeType", "goog.iter.Iterator", "goog.iter.StopIteration"]);
goog.addDependency("/dom/tagname.js", ["goog.dom.TagName"], []);
goog.addDependency("/dom/textrange.js", ["goog.dom.TextRange"], ["goog.array", "goog.dom", "goog.dom.AbstractRange", "goog.dom.RangeType", "goog.dom.SavedRange", "goog.dom.TagName", "goog.dom.TextRangeIterator", "goog.dom.browserrange", "goog.string", "goog.userAgent"]);
goog.addDependency("/dom/textrangeiterator.js", ["goog.dom.TextRangeIterator"], ["goog.array", "goog.dom.NodeType", "goog.dom.RangeIterator", "goog.dom.TagName", "goog.iter.StopIteration"]);
goog.addDependency("/dom/viewportsizemonitor.js", ["goog.dom.ViewportSizeMonitor"], ["goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.math.Size", "goog.userAgent"]);
goog.addDependency("/dom/xml.js", ["goog.dom.xml"], ["goog.dom", "goog.dom.NodeType"]);
goog.addDependency("/editor/browserfeature.js", ["goog.editor.BrowserFeature"], ["goog.editor.defines", "goog.userAgent", "goog.userAgent.product", "goog.userAgent.product.isVersion"]);
goog.addDependency("/editor/clicktoeditwrapper.js", ["goog.editor.ClickToEditWrapper"], ["goog.Disposable", "goog.asserts", "goog.debug.Logger", "goog.dom", "goog.dom.Range", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Field.EventType", "goog.editor.range", "goog.events.BrowserEvent.MouseButton", "goog.events.EventHandler", "goog.events.EventType"]);
goog.addDependency("/editor/command.js", ["goog.editor.Command"], []);
goog.addDependency("/editor/defines.js", ["goog.editor.defines"], []);
goog.addDependency("/editor/field.js", ["goog.editor.Field", "goog.editor.Field.EventType"], ["goog.array", "goog.async.Delay", "goog.debug.Logger", "goog.dom", "goog.dom.Range", "goog.dom.TagName", "goog.dom.classes", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Plugin", "goog.editor.icontent", "goog.editor.icontent.FieldFormatInfo", "goog.editor.icontent.FieldStyleInfo", "goog.editor.node", "goog.editor.range", "goog.events", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.functions", "goog.string", "goog.string.Unicode", "goog.style", "goog.userAgent"]);
goog.addDependency("/editor/focus.js", ["goog.editor.focus"], ["goog.dom.selection"]);
goog.addDependency("/editor/icontent.js", ["goog.editor.icontent", "goog.editor.icontent.FieldFormatInfo", "goog.editor.icontent.FieldStyleInfo"], ["goog.editor.BrowserFeature", "goog.style", "goog.userAgent"]);
goog.addDependency("/editor/link.js", ["goog.editor.Link"], ["goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.node", "goog.editor.range", "goog.string", "goog.string.Unicode", "goog.uri.utils"]);
goog.addDependency("/editor/node.js", ["goog.editor.node"], ["goog.dom", "goog.dom.NodeType", "goog.dom.TagName", "goog.dom.iter.ChildIterator", "goog.dom.iter.SiblingIterator", "goog.iter", "goog.object", "goog.string", "goog.string.Unicode"]);
goog.addDependency("/editor/plugin.js", ["goog.editor.Plugin"], ["goog.debug.Logger", "goog.editor.Command", "goog.events.EventTarget", "goog.functions", "goog.object", "goog.reflect"]);
goog.addDependency("/editor/plugins/abstractbubbleplugin.js", ["goog.editor.plugins.AbstractBubblePlugin"], ["goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.dom.TagName", "goog.editor.Plugin", "goog.editor.style", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.functions", "goog.string.Unicode", "goog.ui.Component.EventType", "goog.ui.editor.Bubble", "goog.userAgent"]);
goog.addDependency("/editor/plugins/abstractdialogplugin.js", ["goog.editor.plugins.AbstractDialogPlugin", "goog.editor.plugins.AbstractDialogPlugin.EventType"], ["goog.dom", "goog.dom.Range", "goog.editor.Field.EventType", "goog.editor.Plugin", "goog.editor.range", "goog.events", "goog.ui.editor.AbstractDialog.EventType"]);
goog.addDependency("/editor/plugins/abstracttabhandler.js", ["goog.editor.plugins.AbstractTabHandler"], ["goog.editor.Plugin", "goog.events.KeyCodes"]);
goog.addDependency("/editor/plugins/basictextformatter.js", ["goog.editor.plugins.BasicTextFormatter", "goog.editor.plugins.BasicTextFormatter.COMMAND"], ["goog.array", "goog.debug.Logger", "goog.dom", "goog.dom.NodeType", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Link", "goog.editor.Plugin", "goog.editor.node", "goog.editor.range", "goog.iter", "goog.object", "goog.string", "goog.string.Unicode", "goog.style", "goog.ui.editor.messages", "goog.userAgent"]);
goog.addDependency("/editor/plugins/blockquote.js", ["goog.editor.plugins.Blockquote"], ["goog.debug.Logger", "goog.dom", "goog.dom.NodeType", "goog.dom.TagName", "goog.dom.classes", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Plugin", "goog.editor.node", "goog.functions"]);
goog.addDependency("/editor/plugins/emoticons.js", ["goog.editor.plugins.Emoticons"], ["goog.dom.TagName", "goog.editor.Plugin", "goog.functions", "goog.ui.emoji.Emoji"]);
goog.addDependency("/editor/plugins/enterhandler.js", ["goog.editor.plugins.EnterHandler"], ["goog.dom", "goog.dom.AbstractRange", "goog.dom.NodeOffset", "goog.dom.NodeType", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Plugin", "goog.editor.node", "goog.editor.plugins.Blockquote", "goog.editor.range", "goog.editor.style", "goog.events.KeyCodes", "goog.string", "goog.userAgent"]);
goog.addDependency("/editor/plugins/equationeditorbubble.js", ["goog.editor.plugins.equation.EquationBubble"], ["goog.dom", "goog.dom.TagName", "goog.editor.Command", "goog.editor.plugins.AbstractBubblePlugin", "goog.string.Unicode", "goog.ui.editor.Bubble", "goog.ui.equation.ImageRenderer"]);
goog.addDependency("/editor/plugins/equationeditorplugin.js", ["goog.editor.plugins.EquationEditorPlugin"], ["goog.editor.Command", "goog.editor.plugins.AbstractDialogPlugin", "goog.editor.range", "goog.functions", "goog.ui.editor.AbstractDialog.Builder", "goog.ui.editor.EquationEditorDialog", "goog.ui.editor.EquationEditorOkEvent", "goog.ui.equation.EquationEditor", "goog.ui.equation.ImageRenderer", "goog.ui.equation.TexEditor"]);
goog.addDependency("/editor/plugins/headerformatter.js", ["goog.editor.plugins.HeaderFormatter"], ["goog.editor.Command", "goog.editor.Plugin", "goog.userAgent"]);
goog.addDependency("/editor/plugins/linkbubble.js", ["goog.editor.plugins.LinkBubble", "goog.editor.plugins.LinkBubble.Action"], ["goog.array", "goog.dom", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Link", "goog.editor.plugins.AbstractBubblePlugin", "goog.editor.range", "goog.string", "goog.style", "goog.ui.editor.messages", "goog.uri.utils", "goog.window"]);
goog.addDependency("/editor/plugins/linkdialogplugin.js", ["goog.editor.plugins.LinkDialogPlugin"], ["goog.array", "goog.editor.Command", "goog.editor.plugins.AbstractDialogPlugin", "goog.events.EventHandler", "goog.functions", "goog.ui.editor.AbstractDialog.EventType", "goog.ui.editor.LinkDialog", "goog.ui.editor.LinkDialog.EventType", "goog.ui.editor.LinkDialog.OkEvent", "goog.uri.utils"]);
goog.addDependency("/editor/plugins/linkshortcutplugin.js", ["goog.editor.plugins.LinkShortcutPlugin"], ["goog.editor.Command", "goog.editor.Link", "goog.editor.Plugin", "goog.string"]);
goog.addDependency("/editor/plugins/listtabhandler.js", ["goog.editor.plugins.ListTabHandler"], ["goog.dom.TagName", "goog.editor.Command", "goog.editor.plugins.AbstractTabHandler"]);
goog.addDependency("/editor/plugins/loremipsum.js", ["goog.editor.plugins.LoremIpsum"], ["goog.asserts", "goog.dom", "goog.editor.Command", "goog.editor.Plugin", "goog.editor.node", "goog.functions"]);
goog.addDependency("/editor/plugins/removeformatting.js", ["goog.editor.plugins.RemoveFormatting"], ["goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Plugin", "goog.editor.node", "goog.editor.range", "goog.string"]);
goog.addDependency("/editor/plugins/spacestabhandler.js", ["goog.editor.plugins.SpacesTabHandler"], ["goog.dom", "goog.dom.TagName", "goog.editor.plugins.AbstractTabHandler", "goog.editor.range"]);
goog.addDependency("/editor/plugins/tableeditor.js", ["goog.editor.plugins.TableEditor"], ["goog.array", "goog.dom", "goog.dom.TagName", "goog.editor.Plugin", "goog.editor.Table", "goog.editor.node", "goog.editor.range", "goog.object"]);
goog.addDependency("/editor/plugins/tagonenterhandler.js", ["goog.editor.plugins.TagOnEnterHandler"], ["goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.dom.TagName", "goog.editor.Command", "goog.editor.node", "goog.editor.plugins.EnterHandler", "goog.editor.range", "goog.editor.style", "goog.events.KeyCodes", "goog.string", "goog.style", "goog.userAgent"]);
goog.addDependency("/editor/plugins/undoredo.js", ["goog.editor.plugins.UndoRedo"], ["goog.debug.Logger", "goog.dom", "goog.dom.NodeOffset", "goog.dom.Range", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Field.EventType", "goog.editor.Plugin", "goog.editor.plugins.UndoRedoManager", "goog.editor.plugins.UndoRedoState", "goog.events", "goog.events.EventHandler"]);
goog.addDependency("/editor/plugins/undoredomanager.js", ["goog.editor.plugins.UndoRedoManager", "goog.editor.plugins.UndoRedoManager.EventType"], ["goog.editor.plugins.UndoRedoState", "goog.events.EventTarget"]);
goog.addDependency("/editor/plugins/undoredostate.js", ["goog.editor.plugins.UndoRedoState"], ["goog.events.EventTarget"]);
goog.addDependency("/editor/range.js", ["goog.editor.range", "goog.editor.range.Point"], ["goog.array", "goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.dom.RangeEndpoint", "goog.dom.SavedCaretRange", "goog.editor.BrowserFeature", "goog.editor.node", "goog.editor.style", "goog.iter"]);
goog.addDependency("/editor/seamlessfield.js", ["goog.editor.SeamlessField"], ["goog.cssom.iframe.style", "goog.debug.Logger", "goog.dom", "goog.dom.Range", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Field", "goog.editor.icontent", "goog.editor.icontent.FieldFormatInfo", "goog.editor.icontent.FieldStyleInfo", "goog.editor.node", "goog.events", "goog.events.EventType", "goog.style"]);
goog.addDependency("/editor/seamlessfield_test.js", ["goog.editor.seamlessfield_test"], ["goog.dom", "goog.dom.DomHelper", "goog.dom.Range", "goog.editor.BrowserFeature", "goog.editor.Field", "goog.editor.SeamlessField", "goog.events", "goog.functions", "goog.style", "goog.testing.MockClock", "goog.testing.MockRange", "goog.testing.jsunit"]);
goog.addDependency("/editor/style.js", ["goog.editor.style"], ["goog.dom", "goog.dom.NodeType", "goog.editor.BrowserFeature", "goog.events.EventType", "goog.object", "goog.style", "goog.userAgent"]);
goog.addDependency("/editor/table.js", ["goog.editor.Table", "goog.editor.TableCell", "goog.editor.TableRow"], ["goog.debug.Logger", "goog.dom", "goog.dom.DomHelper", "goog.dom.NodeType", "goog.dom.TagName", "goog.string.Unicode", "goog.style"]);
goog.addDependency("/events/actioneventwrapper.js", ["goog.events.actionEventWrapper"], ["goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.events.EventWrapper", "goog.events.KeyCodes"]);
goog.addDependency("/events/actionhandler.js", ["goog.events.ActionEvent", "goog.events.ActionHandler", "goog.events.ActionHandler.EventType", "goog.events.BeforeActionEvent"], ["goog.events", "goog.events.BrowserEvent", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.userAgent"]);
goog.addDependency("/events/browserevent.js", ["goog.events.BrowserEvent", "goog.events.BrowserEvent.MouseButton"], ["goog.events.BrowserFeature", "goog.events.Event", "goog.events.EventType", "goog.reflect", "goog.userAgent"]);
goog.addDependency("/events/browserfeature.js", ["goog.events.BrowserFeature"], ["goog.userAgent"]);
goog.addDependency("/events/event.js", ["goog.events.Event"], ["goog.Disposable"]);
goog.addDependency("/events/eventhandler.js", ["goog.events.EventHandler"], ["goog.Disposable", "goog.array", "goog.events", "goog.events.EventWrapper"]);
goog.addDependency("/events/events.js", ["goog.events"], ["goog.array", "goog.debug.entryPointRegistry", "goog.debug.errorHandlerWeakDep", "goog.events.BrowserEvent", "goog.events.BrowserFeature", "goog.events.Event", "goog.events.EventWrapper", "goog.events.Listener", "goog.object", "goog.userAgent"]);
goog.addDependency("/events/eventtarget.js", ["goog.events.EventTarget"], ["goog.Disposable", "goog.events"]);
goog.addDependency("/events/eventtype.js", ["goog.events.EventType"], ["goog.userAgent"]);
goog.addDependency("/events/eventwrapper.js", ["goog.events.EventWrapper"], []);
goog.addDependency("/events/filedrophandler.js", ["goog.events.FileDropHandler", "goog.events.FileDropHandler.EventType"], ["goog.array", "goog.debug.Logger", "goog.dom", "goog.events", "goog.events.BrowserEvent", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType"]);
goog.addDependency("/events/focushandler.js", ["goog.events.FocusHandler", "goog.events.FocusHandler.EventType"], ["goog.events", "goog.events.BrowserEvent", "goog.events.EventTarget", "goog.userAgent"]);
goog.addDependency("/events/imehandler.js", ["goog.events.ImeHandler", "goog.events.ImeHandler.Event", "goog.events.ImeHandler.EventType"], ["goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.userAgent", "goog.userAgent.product"]);
goog.addDependency("/events/inputhandler.js", ["goog.events.InputHandler", "goog.events.InputHandler.EventType"], ["goog.Timer", "goog.dom", "goog.events", "goog.events.BrowserEvent", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.KeyCodes", "goog.userAgent"]);
goog.addDependency("/events/keycodes.js", ["goog.events.KeyCodes"], ["goog.userAgent"]);
goog.addDependency("/events/keyhandler.js", ["goog.events.KeyEvent", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType"], ["goog.events", "goog.events.BrowserEvent", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.userAgent"]);
goog.addDependency("/events/keynames.js", ["goog.events.KeyNames"], []);
goog.addDependency("/events/listener.js", ["goog.events.Listener"], []);
goog.addDependency("/events/mousewheelhandler.js", ["goog.events.MouseWheelEvent", "goog.events.MouseWheelHandler", "goog.events.MouseWheelHandler.EventType"], ["goog.events", "goog.events.BrowserEvent", "goog.events.EventTarget", "goog.math", "goog.userAgent"]);
goog.addDependency("/events/onlinehandler.js", ["goog.events.OnlineHandler", "goog.events.OnlineHandler.EventType"], ["goog.Timer", "goog.events.BrowserFeature", "goog.events.EventHandler", "goog.events.EventTarget", "goog.userAgent"]);
goog.addDependency("/events/pastehandler.js", ["goog.events.PasteHandler", "goog.events.PasteHandler.EventType", "goog.events.PasteHandler.State"], ["goog.Timer", "goog.async.ConditionalDelay", "goog.debug.Logger", "goog.events.BrowserEvent", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes"]);
goog.addDependency("/format/emailaddress.js", ["goog.format.EmailAddress"], ["goog.string"]);
goog.addDependency("/format/format.js", ["goog.format"], ["goog.i18n.GraphemeBreak", "goog.string", "goog.userAgent"]);
goog.addDependency("/format/htmlprettyprinter.js", ["goog.format.HtmlPrettyPrinter", "goog.format.HtmlPrettyPrinter.Buffer"], ["goog.object", "goog.string.StringBuffer"]);
goog.addDependency("/format/jsonprettyprinter.js", ["goog.format.JsonPrettyPrinter", "goog.format.JsonPrettyPrinter.HtmlDelimiters", "goog.format.JsonPrettyPrinter.TextDelimiters"], ["goog.json", "goog.json.Serializer", "goog.string", "goog.string.StringBuffer", "goog.string.format"]);
goog.addDependency("/fs/entry.js", ["goog.fs.DirectoryEntry", "goog.fs.DirectoryEntry.Behavior", "goog.fs.Entry", "goog.fs.FileEntry"], ["goog.array", "goog.async.Deferred", "goog.fs.Error", "goog.fs.FileWriter", "goog.functions", "goog.string"]);
goog.addDependency("/fs/error.js", ["goog.fs.Error", "goog.fs.Error.ErrorCode"], ["goog.debug.Error", "goog.string"]);
goog.addDependency("/fs/filereader.js", ["goog.fs.FileReader", "goog.fs.FileReader.EventType", "goog.fs.FileReader.ReadyState"], ["goog.async.Deferred", "goog.events.Event", "goog.events.EventTarget", "goog.fs.Error", "goog.fs.ProgressEvent"]);
goog.addDependency("/fs/filesaver.js", ["goog.fs.FileSaver", "goog.fs.FileSaver.EventType", "goog.fs.FileSaver.ProgressEvent", "goog.fs.FileSaver.ReadyState"], ["goog.events.Event", "goog.events.EventTarget", "goog.fs.Error", "goog.fs.ProgressEvent"]);
goog.addDependency("/fs/filesystem.js", ["goog.fs.FileSystem"], ["goog.fs.DirectoryEntry"]);
goog.addDependency("/fs/filewriter.js", ["goog.fs.FileWriter"], ["goog.fs.Error", "goog.fs.FileSaver"]);
goog.addDependency("/fs/fs.js", ["goog.fs"], ["goog.async.Deferred", "goog.events", "goog.fs.Error", "goog.fs.FileReader", "goog.fs.FileSystem"]);
goog.addDependency("/fs/progressevent.js", ["goog.fs.ProgressEvent"], ["goog.events.Event"]);
goog.addDependency("/functions/functions.js", ["goog.functions"], []);
goog.addDependency("/fx/abstractdragdrop.js", ["goog.fx.AbstractDragDrop", "goog.fx.AbstractDragDrop.EventType", "goog.fx.DragDropEvent", "goog.fx.DragDropItem"], ["goog.dom", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType", "goog.fx.Dragger", "goog.fx.Dragger.EventType", "goog.math.Box", "goog.math.Coordinate", "goog.style"]);
goog.addDependency("/fx/anim/anim.js", ["goog.fx.anim", "goog.fx.anim.Animated"], ["goog.Timer", "goog.events", "goog.object"]);
goog.addDependency("/fx/animation.js", ["goog.fx.Animation", "goog.fx.Animation.EventType", "goog.fx.Animation.State", "goog.fx.AnimationEvent"], ["goog.array", "goog.events.Event", "goog.fx.Transition", "goog.fx.Transition.EventType", "goog.fx.TransitionBase.State", "goog.fx.anim", "goog.fx.anim.Animated"]);
goog.addDependency("/fx/animationqueue.js", ["goog.fx.AnimationParallelQueue", "goog.fx.AnimationQueue", "goog.fx.AnimationSerialQueue"], ["goog.array", "goog.asserts", "goog.events.EventHandler", "goog.fx.Transition.EventType", "goog.fx.TransitionBase", "goog.fx.TransitionBase.State"]);
goog.addDependency("/fx/css3/fx.js", ["goog.fx.css3"], ["goog.fx.css3.Transition"]);
goog.addDependency("/fx/css3/transition.js", ["goog.fx.css3.Transition"], ["goog.Timer", "goog.fx.TransitionBase", "goog.style", "goog.style.transition"]);
goog.addDependency("/fx/cssspriteanimation.js", ["goog.fx.CssSpriteAnimation"], ["goog.fx.Animation"]);
goog.addDependency("/fx/dom.js", ["goog.fx.dom", "goog.fx.dom.BgColorTransform", "goog.fx.dom.ColorTransform", "goog.fx.dom.Fade", "goog.fx.dom.FadeIn", "goog.fx.dom.FadeInAndShow", "goog.fx.dom.FadeOut", "goog.fx.dom.FadeOutAndHide", "goog.fx.dom.PredefinedEffect", "goog.fx.dom.Resize", "goog.fx.dom.ResizeHeight", "goog.fx.dom.ResizeWidth", "goog.fx.dom.Scroll", "goog.fx.dom.Slide", "goog.fx.dom.SlideFrom", "goog.fx.dom.Swipe"], ["goog.color", "goog.events", "goog.fx.Animation", "goog.fx.Transition.EventType", "goog.style"]);
goog.addDependency("/fx/dragdrop.js", ["goog.fx.DragDrop"], ["goog.fx.AbstractDragDrop", "goog.fx.DragDropItem"]);
goog.addDependency("/fx/dragdropgroup.js", ["goog.fx.DragDropGroup"], ["goog.dom", "goog.fx.AbstractDragDrop", "goog.fx.DragDropItem"]);
goog.addDependency("/fx/dragger.js", ["goog.fx.DragEvent", "goog.fx.Dragger", "goog.fx.Dragger.EventType"], ["goog.dom", "goog.events", "goog.events.BrowserEvent.MouseButton", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.math.Coordinate", "goog.math.Rect", "goog.style", "goog.style.bidi", "goog.userAgent"]);
goog.addDependency("/fx/draglistgroup.js", ["goog.fx.DragListDirection", "goog.fx.DragListGroup", "goog.fx.DragListGroup.EventType", "goog.fx.DragListGroupEvent"], ["goog.asserts", "goog.dom", "goog.dom.NodeType", "goog.dom.classes", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.fx.Dragger", "goog.fx.Dragger.EventType", "goog.math.Coordinate", "goog.style"]);
goog.addDependency("/fx/dragscrollsupport.js", ["goog.fx.DragScrollSupport"], ["goog.Disposable", "goog.Timer", "goog.dom", "goog.events.EventHandler", "goog.events.EventType", "goog.math.Coordinate", "goog.style"]);
goog.addDependency("/fx/easing.js", ["goog.fx.easing"], []);
goog.addDependency("/fx/fx.js", ["goog.fx"], ["goog.asserts", "goog.fx.Animation", "goog.fx.Animation.EventType", "goog.fx.Animation.State", "goog.fx.AnimationEvent", "goog.fx.Transition.EventType", "goog.fx.easing"]);
goog.addDependency("/fx/transition.js", ["goog.fx.Transition", "goog.fx.Transition.EventType"], []);
goog.addDependency("/fx/transitionbase.js", ["goog.fx.TransitionBase", "goog.fx.TransitionBase.State"], ["goog.events.EventTarget", "goog.fx.Transition", "goog.fx.Transition.EventType"]);
goog.addDependency("/gears/basestore.js", ["goog.gears.BaseStore", "goog.gears.BaseStore.SchemaType"], ["goog.Disposable"]);
goog.addDependency("/gears/database.js", ["goog.gears.Database", "goog.gears.Database.EventType", "goog.gears.Database.TransactionEvent"], ["goog.array", "goog.debug", "goog.debug.Logger", "goog.events.Event", "goog.events.EventTarget", "goog.gears", "goog.json"]);
goog.addDependency("/gears/fakeworkerpool.js", ["goog.gears.FakeWorkerPool"], ["goog.Uri", "goog.gears", "goog.gears.WorkerPool", "goog.net.XmlHttp"]);
goog.addDependency("/gears/gears.js", ["goog.gears"], ["goog.string"]);
goog.addDependency("/gears/httprequest.js", ["goog.gears.HttpRequest"], ["goog.Timer", "goog.gears", "goog.net.WrapperXmlHttpFactory", "goog.net.XmlHttp"]);
goog.addDependency("/gears/loggerclient.js", ["goog.gears.LoggerClient"], ["goog.Disposable", "goog.debug", "goog.debug.Logger"]);
goog.addDependency("/gears/loggerserver.js", ["goog.gears.LoggerServer"], ["goog.Disposable", "goog.debug.Logger", "goog.debug.Logger.Level", "goog.gears.Worker.EventType"]);
goog.addDependency("/gears/logstore.js", ["goog.gears.LogStore", "goog.gears.LogStore.Query"], ["goog.async.Delay", "goog.debug.LogManager", "goog.debug.LogRecord", "goog.debug.Logger", "goog.debug.Logger.Level", "goog.gears.BaseStore", "goog.gears.BaseStore.SchemaType", "goog.json"]);
goog.addDependency("/gears/managedresourcestore.js", ["goog.gears.ManagedResourceStore", "goog.gears.ManagedResourceStore.EventType", "goog.gears.ManagedResourceStore.UpdateStatus", "goog.gears.ManagedResourceStoreEvent"], ["goog.debug.Logger", "goog.events.Event", "goog.events.EventTarget", "goog.gears", "goog.string"]);
goog.addDependency("/gears/multipartformdata.js", ["goog.gears.MultipartFormData"], ["goog.asserts", "goog.gears", "goog.string"]);
goog.addDependency("/gears/statustype.js", ["goog.gears.StatusType"], []);
goog.addDependency("/gears/urlcapture.js", ["goog.gears.UrlCapture", "goog.gears.UrlCapture.Event", "goog.gears.UrlCapture.EventType"], ["goog.Uri", "goog.debug.Logger", "goog.events.Event", "goog.events.EventTarget", "goog.gears"]);
goog.addDependency("/gears/worker.js", ["goog.gears.Worker", "goog.gears.Worker.EventType", "goog.gears.WorkerEvent"], ["goog.events.Event", "goog.events.EventTarget"]);
goog.addDependency("/gears/workerchannel.js", ["goog.gears.WorkerChannel"], ["goog.Disposable", "goog.debug", "goog.debug.Logger", "goog.events", "goog.gears.Worker", "goog.gears.Worker.EventType", "goog.gears.WorkerEvent", "goog.json", "goog.messaging.AbstractChannel"]);
goog.addDependency("/gears/workerpool.js", ["goog.gears.WorkerPool", "goog.gears.WorkerPool.Event", "goog.gears.WorkerPool.EventType"], ["goog.events.Event", "goog.events.EventTarget", "goog.gears", "goog.gears.Worker"]);
goog.addDependency("/graphics/abstractgraphics.js", ["goog.graphics.AbstractGraphics"], ["goog.graphics.Path", "goog.math.Coordinate", "goog.math.Size", "goog.style", "goog.ui.Component"]);
goog.addDependency("/graphics/affinetransform.js", ["goog.graphics.AffineTransform"], ["goog.math"]);
goog.addDependency("/graphics/canvaselement.js", ["goog.graphics.CanvasEllipseElement", "goog.graphics.CanvasGroupElement", "goog.graphics.CanvasImageElement", "goog.graphics.CanvasPathElement", "goog.graphics.CanvasRectElement", "goog.graphics.CanvasTextElement"], ["goog.array", "goog.dom", "goog.dom.TagName", "goog.graphics.EllipseElement", "goog.graphics.GroupElement", "goog.graphics.ImageElement", "goog.graphics.Path", "goog.graphics.PathElement", "goog.graphics.RectElement", "goog.graphics.TextElement"]);
goog.addDependency("/graphics/canvasgraphics.js", ["goog.graphics.CanvasGraphics"], ["goog.dom", "goog.events.EventType", "goog.graphics.AbstractGraphics", "goog.graphics.CanvasEllipseElement", "goog.graphics.CanvasGroupElement", "goog.graphics.CanvasImageElement", "goog.graphics.CanvasPathElement", "goog.graphics.CanvasRectElement", "goog.graphics.CanvasTextElement", "goog.graphics.Font", "goog.graphics.LinearGradient", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.math.Size"]);
goog.addDependency("/graphics/element.js", ["goog.graphics.Element"], ["goog.events", "goog.events.EventTarget", "goog.graphics.AffineTransform", "goog.math"]);
goog.addDependency("/graphics/ellipseelement.js", ["goog.graphics.EllipseElement"], ["goog.graphics.StrokeAndFillElement"]);
goog.addDependency("/graphics/ext/coordinates.js", ["goog.graphics.ext.coordinates"], ["goog.string"]);
goog.addDependency("/graphics/ext/element.js", ["goog.graphics.ext.Element"], ["goog.events", "goog.events.EventTarget", "goog.functions", "goog.graphics", "goog.graphics.ext.coordinates"]);
goog.addDependency("/graphics/ext/ellipse.js", ["goog.graphics.ext.Ellipse"], ["goog.graphics.ext.StrokeAndFillElement"]);
goog.addDependency("/graphics/ext/ext.js", ["goog.graphics.ext"], ["goog.graphics.ext.Ellipse", "goog.graphics.ext.Graphics", "goog.graphics.ext.Group", "goog.graphics.ext.Image", "goog.graphics.ext.Rectangle", "goog.graphics.ext.Shape", "goog.graphics.ext.coordinates"]);
goog.addDependency("/graphics/ext/graphics.js", ["goog.graphics.ext.Graphics"], ["goog.events.EventType", "goog.graphics.ext.Group"]);
goog.addDependency("/graphics/ext/group.js", ["goog.graphics.ext.Group"], ["goog.graphics.ext.Element"]);
goog.addDependency("/graphics/ext/image.js", ["goog.graphics.ext.Image"], ["goog.graphics.ext.Element"]);
goog.addDependency("/graphics/ext/path.js", ["goog.graphics.ext.Path"], ["goog.graphics.AffineTransform", "goog.graphics.Path", "goog.math", "goog.math.Rect"]);
goog.addDependency("/graphics/ext/rectangle.js", ["goog.graphics.ext.Rectangle"], ["goog.graphics.ext.StrokeAndFillElement"]);
goog.addDependency("/graphics/ext/shape.js", ["goog.graphics.ext.Shape"], ["goog.graphics.ext.Path", "goog.graphics.ext.StrokeAndFillElement", "goog.math.Rect"]);
goog.addDependency("/graphics/ext/strokeandfillelement.js", ["goog.graphics.ext.StrokeAndFillElement"], ["goog.graphics.ext.Element"]);
goog.addDependency("/graphics/fill.js", ["goog.graphics.Fill"], []);
goog.addDependency("/graphics/font.js", ["goog.graphics.Font"], []);
goog.addDependency("/graphics/graphics.js", ["goog.graphics"], ["goog.graphics.CanvasGraphics", "goog.graphics.SvgGraphics", "goog.graphics.VmlGraphics", "goog.userAgent"]);
goog.addDependency("/graphics/groupelement.js", ["goog.graphics.GroupElement"], ["goog.graphics.Element"]);
goog.addDependency("/graphics/imageelement.js", ["goog.graphics.ImageElement"], ["goog.graphics.Element"]);
goog.addDependency("/graphics/lineargradient.js", ["goog.graphics.LinearGradient"], ["goog.asserts", "goog.graphics.Fill"]);
goog.addDependency("/graphics/path.js", ["goog.graphics.Path", "goog.graphics.Path.Segment"], ["goog.array", "goog.math"]);
goog.addDependency("/graphics/pathelement.js", ["goog.graphics.PathElement"], ["goog.graphics.StrokeAndFillElement"]);
goog.addDependency("/graphics/paths.js", ["goog.graphics.paths"], ["goog.graphics.Path", "goog.math.Coordinate"]);
goog.addDependency("/graphics/rectelement.js", ["goog.graphics.RectElement"], ["goog.graphics.StrokeAndFillElement"]);
goog.addDependency("/graphics/solidfill.js", ["goog.graphics.SolidFill"], ["goog.graphics.Fill"]);
goog.addDependency("/graphics/stroke.js", ["goog.graphics.Stroke"], []);
goog.addDependency("/graphics/strokeandfillelement.js", ["goog.graphics.StrokeAndFillElement"], ["goog.graphics.Element"]);
goog.addDependency("/graphics/svgelement.js", ["goog.graphics.SvgEllipseElement", "goog.graphics.SvgGroupElement", "goog.graphics.SvgImageElement", "goog.graphics.SvgPathElement", "goog.graphics.SvgRectElement", "goog.graphics.SvgTextElement"], ["goog.dom", "goog.graphics.EllipseElement", "goog.graphics.GroupElement", "goog.graphics.ImageElement", "goog.graphics.PathElement", "goog.graphics.RectElement", "goog.graphics.TextElement"]);
goog.addDependency("/graphics/svggraphics.js", ["goog.graphics.SvgGraphics"], ["goog.Timer", "goog.dom", "goog.events.EventHandler", "goog.events.EventType", "goog.graphics.AbstractGraphics", "goog.graphics.Font", "goog.graphics.LinearGradient", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.graphics.SvgEllipseElement", "goog.graphics.SvgGroupElement", "goog.graphics.SvgImageElement", "goog.graphics.SvgPathElement", "goog.graphics.SvgRectElement", "goog.graphics.SvgTextElement", "goog.math.Size", "goog.style", "goog.userAgent"]);
goog.addDependency("/graphics/textelement.js", ["goog.graphics.TextElement"], ["goog.graphics.StrokeAndFillElement"]);
goog.addDependency("/graphics/vmlelement.js", ["goog.graphics.VmlEllipseElement", "goog.graphics.VmlGroupElement", "goog.graphics.VmlImageElement", "goog.graphics.VmlPathElement", "goog.graphics.VmlRectElement", "goog.graphics.VmlTextElement"], ["goog.dom", "goog.graphics.EllipseElement", "goog.graphics.GroupElement", "goog.graphics.ImageElement", "goog.graphics.PathElement", "goog.graphics.RectElement", "goog.graphics.TextElement"]);
goog.addDependency("/graphics/vmlgraphics.js", ["goog.graphics.VmlGraphics"], ["goog.array", "goog.dom", "goog.events.EventHandler", "goog.events.EventType", "goog.graphics.AbstractGraphics", "goog.graphics.Font", "goog.graphics.LinearGradient", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.graphics.VmlEllipseElement", "goog.graphics.VmlGroupElement", "goog.graphics.VmlImageElement", "goog.graphics.VmlPathElement", "goog.graphics.VmlRectElement", "goog.graphics.VmlTextElement", "goog.math.Size", "goog.string", "goog.style"]);
goog.addDependency("/history/event.js", ["goog.history.Event"], ["goog.events.Event", "goog.history.EventType"]);
goog.addDependency("/history/eventtype.js", ["goog.history.EventType"], []);
goog.addDependency("/history/history.js", ["goog.History", "goog.History.Event", "goog.History.EventType"], ["goog.Timer", "goog.dom", "goog.events", "goog.events.BrowserEvent", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.history.Event", "goog.history.EventType", "goog.string", "goog.userAgent"]);
goog.addDependency("/history/html5history.js", ["goog.history.Html5History", "goog.history.Html5History.TokenTransformer"], ["goog.asserts", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.history.Event", "goog.history.EventType"]);
goog.addDependency("/i18n/bidi.js", ["goog.i18n.bidi"], []);
goog.addDependency("/i18n/bidiformatter.js", ["goog.i18n.BidiFormatter"], ["goog.i18n.bidi", "goog.string"]);
goog.addDependency("/i18n/charlistdecompressor.js", ["goog.i18n.CharListDecompressor"], ["goog.array", "goog.i18n.uChar"]);
goog.addDependency("/i18n/charpickerdata.js", ["goog.i18n.CharPickerData"], []);
goog.addDependency("/i18n/currency.js", ["goog.i18n.currency"], []);
goog.addDependency("/i18n/currencycodemap.js", ["goog.i18n.currencyCodeMap", "goog.i18n.currencyCodeMapTier2"], []);
goog.addDependency("/i18n/datetimeformat.js", ["goog.i18n.DateTimeFormat", "goog.i18n.DateTimeFormat.Format"], ["goog.asserts", "goog.date.DateLike", "goog.i18n.DateTimeSymbols", "goog.i18n.TimeZone", "goog.string"]);
goog.addDependency("/i18n/datetimeparse.js", ["goog.i18n.DateTimeParse"], ["goog.date.DateLike", "goog.i18n.DateTimeFormat", "goog.i18n.DateTimeSymbols"]);
goog.addDependency("/i18n/datetimepatterns.js", ["goog.i18n.DateTimePatterns", "goog.i18n.DateTimePatterns_af", "goog.i18n.DateTimePatterns_am", "goog.i18n.DateTimePatterns_ar", "goog.i18n.DateTimePatterns_bg", "goog.i18n.DateTimePatterns_bn", "goog.i18n.DateTimePatterns_ca", "goog.i18n.DateTimePatterns_cs", "goog.i18n.DateTimePatterns_da", "goog.i18n.DateTimePatterns_de", "goog.i18n.DateTimePatterns_de_AT", "goog.i18n.DateTimePatterns_de_CH", "goog.i18n.DateTimePatterns_el", "goog.i18n.DateTimePatterns_en", "goog.i18n.DateTimePatterns_en_AU", "goog.i18n.DateTimePatterns_en_GB", "goog.i18n.DateTimePatterns_en_IE", "goog.i18n.DateTimePatterns_en_IN", "goog.i18n.DateTimePatterns_en_SG", "goog.i18n.DateTimePatterns_en_US", "goog.i18n.DateTimePatterns_en_ZA", "goog.i18n.DateTimePatterns_es", "goog.i18n.DateTimePatterns_es_419", "goog.i18n.DateTimePatterns_et", "goog.i18n.DateTimePatterns_eu", "goog.i18n.DateTimePatterns_fa", "goog.i18n.DateTimePatterns_fi", "goog.i18n.DateTimePatterns_fil", "goog.i18n.DateTimePatterns_fr", "goog.i18n.DateTimePatterns_fr_CA", "goog.i18n.DateTimePatterns_gl", "goog.i18n.DateTimePatterns_gsw", "goog.i18n.DateTimePatterns_gu", "goog.i18n.DateTimePatterns_he", "goog.i18n.DateTimePatterns_hi", "goog.i18n.DateTimePatterns_hr", "goog.i18n.DateTimePatterns_hu", "goog.i18n.DateTimePatterns_id", "goog.i18n.DateTimePatterns_in", "goog.i18n.DateTimePatterns_is", "goog.i18n.DateTimePatterns_it", "goog.i18n.DateTimePatterns_iw", "goog.i18n.DateTimePatterns_ja", "goog.i18n.DateTimePatterns_kn", "goog.i18n.DateTimePatterns_ko", "goog.i18n.DateTimePatterns_ln", "goog.i18n.DateTimePatterns_lt", "goog.i18n.DateTimePatterns_lv", "goog.i18n.DateTimePatterns_ml", "goog.i18n.DateTimePatterns_mo", "goog.i18n.DateTimePatterns_mr", "goog.i18n.DateTimePatterns_ms", "goog.i18n.DateTimePatterns_mt", "goog.i18n.DateTimePatterns_nl", "goog.i18n.DateTimePatterns_no", "goog.i18n.DateTimePatterns_or", "goog.i18n.DateTimePatterns_pl", "goog.i18n.DateTimePatterns_pt_BR", "goog.i18n.DateTimePatterns_pt_PT", "goog.i18n.DateTimePatterns_pt", "goog.i18n.DateTimePatterns_ro", "goog.i18n.DateTimePatterns_ru", "goog.i18n.DateTimePatterns_sk", "goog.i18n.DateTimePatterns_sl", "goog.i18n.DateTimePatterns_sq", "goog.i18n.DateTimePatterns_sr", "goog.i18n.DateTimePatterns_sv", "goog.i18n.DateTimePatterns_sw", "goog.i18n.DateTimePatterns_ta", "goog.i18n.DateTimePatterns_te", "goog.i18n.DateTimePatterns_th", "goog.i18n.DateTimePatterns_tl", "goog.i18n.DateTimePatterns_tr", "goog.i18n.DateTimePatterns_uk", "goog.i18n.DateTimePatterns_ur", "goog.i18n.DateTimePatterns_vi", "goog.i18n.DateTimePatterns_zh_TW", "goog.i18n.DateTimePatterns_zh_CN", "goog.i18n.DateTimePatterns_zh_HK", "goog.i18n.DateTimePatterns_zh", "goog.i18n.DateTimePatterns_zu"], []);
goog.addDependency("/i18n/datetimepatternsext.js", ["goog.i18n.DateTimePatternsExt", "goog.i18n.DateTimePatterns_af_NA", "goog.i18n.DateTimePatterns_af_ZA", "goog.i18n.DateTimePatterns_agq", "goog.i18n.DateTimePatterns_agq_CM", "goog.i18n.DateTimePatterns_ak", "goog.i18n.DateTimePatterns_ak_GH", "goog.i18n.DateTimePatterns_am_ET", "goog.i18n.DateTimePatterns_ar_AE", "goog.i18n.DateTimePatterns_ar_BH", "goog.i18n.DateTimePatterns_ar_DZ", "goog.i18n.DateTimePatterns_ar_EG", "goog.i18n.DateTimePatterns_ar_IQ", "goog.i18n.DateTimePatterns_ar_JO", "goog.i18n.DateTimePatterns_ar_KW", "goog.i18n.DateTimePatterns_ar_LB", "goog.i18n.DateTimePatterns_ar_LY", "goog.i18n.DateTimePatterns_ar_MA", "goog.i18n.DateTimePatterns_ar_OM", "goog.i18n.DateTimePatterns_ar_QA", "goog.i18n.DateTimePatterns_ar_SA", "goog.i18n.DateTimePatterns_ar_SD", "goog.i18n.DateTimePatterns_ar_SY", "goog.i18n.DateTimePatterns_ar_TN", "goog.i18n.DateTimePatterns_ar_YE", "goog.i18n.DateTimePatterns_as", "goog.i18n.DateTimePatterns_as_IN", "goog.i18n.DateTimePatterns_asa", "goog.i18n.DateTimePatterns_asa_TZ", "goog.i18n.DateTimePatterns_az", "goog.i18n.DateTimePatterns_az_Cyrl", "goog.i18n.DateTimePatterns_az_Cyrl_AZ", "goog.i18n.DateTimePatterns_az_Latn", "goog.i18n.DateTimePatterns_az_Latn_AZ", "goog.i18n.DateTimePatterns_bas", "goog.i18n.DateTimePatterns_bas_CM", "goog.i18n.DateTimePatterns_be", "goog.i18n.DateTimePatterns_be_BY", "goog.i18n.DateTimePatterns_bem", "goog.i18n.DateTimePatterns_bem_ZM", "goog.i18n.DateTimePatterns_bez", "goog.i18n.DateTimePatterns_bez_TZ", "goog.i18n.DateTimePatterns_bg_BG", "goog.i18n.DateTimePatterns_bm", "goog.i18n.DateTimePatterns_bm_ML", "goog.i18n.DateTimePatterns_bn_BD", "goog.i18n.DateTimePatterns_bn_IN", "goog.i18n.DateTimePatterns_bo", "goog.i18n.DateTimePatterns_bo_CN", "goog.i18n.DateTimePatterns_bo_IN", "goog.i18n.DateTimePatterns_br", "goog.i18n.DateTimePatterns_br_FR", "goog.i18n.DateTimePatterns_brx", "goog.i18n.DateTimePatterns_brx_IN", "goog.i18n.DateTimePatterns_bs", "goog.i18n.DateTimePatterns_bs_BA", "goog.i18n.DateTimePatterns_ca_ES", "goog.i18n.DateTimePatterns_cgg", "goog.i18n.DateTimePatterns_cgg_UG", "goog.i18n.DateTimePatterns_chr", "goog.i18n.DateTimePatterns_chr_US", "goog.i18n.DateTimePatterns_cs_CZ", "goog.i18n.DateTimePatterns_cy", "goog.i18n.DateTimePatterns_cy_GB", "goog.i18n.DateTimePatterns_da_DK", "goog.i18n.DateTimePatterns_dav", "goog.i18n.DateTimePatterns_dav_KE", "goog.i18n.DateTimePatterns_de_BE", "goog.i18n.DateTimePatterns_de_DE", "goog.i18n.DateTimePatterns_de_LI", "goog.i18n.DateTimePatterns_de_LU", "goog.i18n.DateTimePatterns_dje", "goog.i18n.DateTimePatterns_dje_NE", "goog.i18n.DateTimePatterns_dua", "goog.i18n.DateTimePatterns_dua_CM", "goog.i18n.DateTimePatterns_dyo", "goog.i18n.DateTimePatterns_dyo_SN", "goog.i18n.DateTimePatterns_ebu", "goog.i18n.DateTimePatterns_ebu_KE", "goog.i18n.DateTimePatterns_ee", "goog.i18n.DateTimePatterns_ee_GH", "goog.i18n.DateTimePatterns_ee_TG", "goog.i18n.DateTimePatterns_el_CY", "goog.i18n.DateTimePatterns_el_GR", "goog.i18n.DateTimePatterns_en_AS", "goog.i18n.DateTimePatterns_en_BB", "goog.i18n.DateTimePatterns_en_BE", "goog.i18n.DateTimePatterns_en_BM", "goog.i18n.DateTimePatterns_en_BW", "goog.i18n.DateTimePatterns_en_BZ", "goog.i18n.DateTimePatterns_en_CA", "goog.i18n.DateTimePatterns_en_GU", "goog.i18n.DateTimePatterns_en_GY", "goog.i18n.DateTimePatterns_en_HK", "goog.i18n.DateTimePatterns_en_JM", "goog.i18n.DateTimePatterns_en_MH", "goog.i18n.DateTimePatterns_en_MP", "goog.i18n.DateTimePatterns_en_MT", "goog.i18n.DateTimePatterns_en_MU", "goog.i18n.DateTimePatterns_en_NA", "goog.i18n.DateTimePatterns_en_NZ", "goog.i18n.DateTimePatterns_en_PH", "goog.i18n.DateTimePatterns_en_PK", "goog.i18n.DateTimePatterns_en_TT", "goog.i18n.DateTimePatterns_en_UM", "goog.i18n.DateTimePatterns_en_US_POSIX", "goog.i18n.DateTimePatterns_en_VI", "goog.i18n.DateTimePatterns_en_ZW", "goog.i18n.DateTimePatterns_eo", "goog.i18n.DateTimePatterns_es_AR", "goog.i18n.DateTimePatterns_es_BO", "goog.i18n.DateTimePatterns_es_CL", "goog.i18n.DateTimePatterns_es_CO", "goog.i18n.DateTimePatterns_es_CR", "goog.i18n.DateTimePatterns_es_DO", "goog.i18n.DateTimePatterns_es_EC", "goog.i18n.DateTimePatterns_es_ES", "goog.i18n.DateTimePatterns_es_GQ", "goog.i18n.DateTimePatterns_es_GT", "goog.i18n.DateTimePatterns_es_HN", "goog.i18n.DateTimePatterns_es_MX", "goog.i18n.DateTimePatterns_es_NI", "goog.i18n.DateTimePatterns_es_PA", "goog.i18n.DateTimePatterns_es_PE", "goog.i18n.DateTimePatterns_es_PR", "goog.i18n.DateTimePatterns_es_PY", "goog.i18n.DateTimePatterns_es_SV", "goog.i18n.DateTimePatterns_es_US", "goog.i18n.DateTimePatterns_es_UY", "goog.i18n.DateTimePatterns_es_VE", "goog.i18n.DateTimePatterns_et_EE", "goog.i18n.DateTimePatterns_eu_ES", "goog.i18n.DateTimePatterns_ewo", "goog.i18n.DateTimePatterns_ewo_CM", "goog.i18n.DateTimePatterns_fa_AF", "goog.i18n.DateTimePatterns_fa_IR", "goog.i18n.DateTimePatterns_ff", "goog.i18n.DateTimePatterns_ff_SN", "goog.i18n.DateTimePatterns_fi_FI", "goog.i18n.DateTimePatterns_fil_PH", "goog.i18n.DateTimePatterns_fo", "goog.i18n.DateTimePatterns_fo_FO", "goog.i18n.DateTimePatterns_fr_BE", "goog.i18n.DateTimePatterns_fr_BF", "goog.i18n.DateTimePatterns_fr_BI", "goog.i18n.DateTimePatterns_fr_BJ", "goog.i18n.DateTimePatterns_fr_BL", "goog.i18n.DateTimePatterns_fr_CD", "goog.i18n.DateTimePatterns_fr_CF", "goog.i18n.DateTimePatterns_fr_CG", "goog.i18n.DateTimePatterns_fr_CH", "goog.i18n.DateTimePatterns_fr_CI", "goog.i18n.DateTimePatterns_fr_CM", "goog.i18n.DateTimePatterns_fr_DJ", "goog.i18n.DateTimePatterns_fr_FR", "goog.i18n.DateTimePatterns_fr_GA", "goog.i18n.DateTimePatterns_fr_GF", "goog.i18n.DateTimePatterns_fr_GN", "goog.i18n.DateTimePatterns_fr_GP", "goog.i18n.DateTimePatterns_fr_GQ", "goog.i18n.DateTimePatterns_fr_KM", "goog.i18n.DateTimePatterns_fr_LU", "goog.i18n.DateTimePatterns_fr_MC", "goog.i18n.DateTimePatterns_fr_MF", "goog.i18n.DateTimePatterns_fr_MG", "goog.i18n.DateTimePatterns_fr_ML", "goog.i18n.DateTimePatterns_fr_MQ", "goog.i18n.DateTimePatterns_fr_NE", "goog.i18n.DateTimePatterns_fr_RE", "goog.i18n.DateTimePatterns_fr_RW", "goog.i18n.DateTimePatterns_fr_SN", "goog.i18n.DateTimePatterns_fr_TD", "goog.i18n.DateTimePatterns_fr_TG", "goog.i18n.DateTimePatterns_fr_YT", "goog.i18n.DateTimePatterns_ga", "goog.i18n.DateTimePatterns_ga_IE", "goog.i18n.DateTimePatterns_gl_ES", "goog.i18n.DateTimePatterns_gsw_CH", "goog.i18n.DateTimePatterns_gu_IN", "goog.i18n.DateTimePatterns_guz", "goog.i18n.DateTimePatterns_guz_KE", "goog.i18n.DateTimePatterns_gv", "goog.i18n.DateTimePatterns_gv_GB", "goog.i18n.DateTimePatterns_ha", "goog.i18n.DateTimePatterns_ha_Latn", "goog.i18n.DateTimePatterns_ha_Latn_GH", "goog.i18n.DateTimePatterns_ha_Latn_NE", "goog.i18n.DateTimePatterns_ha_Latn_NG", "goog.i18n.DateTimePatterns_haw", "goog.i18n.DateTimePatterns_haw_US", "goog.i18n.DateTimePatterns_he_IL", "goog.i18n.DateTimePatterns_hi_IN", "goog.i18n.DateTimePatterns_hr_HR", "goog.i18n.DateTimePatterns_hu_HU", "goog.i18n.DateTimePatterns_hy", "goog.i18n.DateTimePatterns_hy_AM", "goog.i18n.DateTimePatterns_id_ID", "goog.i18n.DateTimePatterns_ig", "goog.i18n.DateTimePatterns_ig_NG", "goog.i18n.DateTimePatterns_ii", "goog.i18n.DateTimePatterns_ii_CN", "goog.i18n.DateTimePatterns_is_IS", "goog.i18n.DateTimePatterns_it_CH", "goog.i18n.DateTimePatterns_it_IT", "goog.i18n.DateTimePatterns_ja_JP", "goog.i18n.DateTimePatterns_jmc", "goog.i18n.DateTimePatterns_jmc_TZ", "goog.i18n.DateTimePatterns_ka", "goog.i18n.DateTimePatterns_ka_GE", "goog.i18n.DateTimePatterns_kab", "goog.i18n.DateTimePatterns_kab_DZ", "goog.i18n.DateTimePatterns_kam", "goog.i18n.DateTimePatterns_kam_KE", "goog.i18n.DateTimePatterns_kde", "goog.i18n.DateTimePatterns_kde_TZ", "goog.i18n.DateTimePatterns_kea", "goog.i18n.DateTimePatterns_kea_CV", "goog.i18n.DateTimePatterns_khq", "goog.i18n.DateTimePatterns_khq_ML", "goog.i18n.DateTimePatterns_ki", "goog.i18n.DateTimePatterns_ki_KE", "goog.i18n.DateTimePatterns_kk", "goog.i18n.DateTimePatterns_kk_Cyrl", "goog.i18n.DateTimePatterns_kk_Cyrl_KZ", "goog.i18n.DateTimePatterns_kl", "goog.i18n.DateTimePatterns_kl_GL", "goog.i18n.DateTimePatterns_kln", "goog.i18n.DateTimePatterns_kln_KE", "goog.i18n.DateTimePatterns_km", "goog.i18n.DateTimePatterns_km_KH", "goog.i18n.DateTimePatterns_kn_IN", "goog.i18n.DateTimePatterns_ko_KR", "goog.i18n.DateTimePatterns_kok", "goog.i18n.DateTimePatterns_kok_IN", "goog.i18n.DateTimePatterns_ksb", "goog.i18n.DateTimePatterns_ksb_TZ", "goog.i18n.DateTimePatterns_ksf", "goog.i18n.DateTimePatterns_ksf_CM", "goog.i18n.DateTimePatterns_kw", "goog.i18n.DateTimePatterns_kw_GB", "goog.i18n.DateTimePatterns_lag", "goog.i18n.DateTimePatterns_lag_TZ", "goog.i18n.DateTimePatterns_lg", "goog.i18n.DateTimePatterns_lg_UG", "goog.i18n.DateTimePatterns_ln_CD", "goog.i18n.DateTimePatterns_ln_CG", "goog.i18n.DateTimePatterns_lt_LT", "goog.i18n.DateTimePatterns_lu", "goog.i18n.DateTimePatterns_lu_CD", "goog.i18n.DateTimePatterns_luo", "goog.i18n.DateTimePatterns_luo_KE", "goog.i18n.DateTimePatterns_luy", "goog.i18n.DateTimePatterns_luy_KE", "goog.i18n.DateTimePatterns_lv_LV", "goog.i18n.DateTimePatterns_mas", "goog.i18n.DateTimePatterns_mas_KE", "goog.i18n.DateTimePatterns_mas_TZ", "goog.i18n.DateTimePatterns_mer", "goog.i18n.DateTimePatterns_mer_KE", "goog.i18n.DateTimePatterns_mfe", "goog.i18n.DateTimePatterns_mfe_MU", "goog.i18n.DateTimePatterns_mg", "goog.i18n.DateTimePatterns_mg_MG", "goog.i18n.DateTimePatterns_mgh", "goog.i18n.DateTimePatterns_mgh_MZ", "goog.i18n.DateTimePatterns_mk", "goog.i18n.DateTimePatterns_mk_MK", "goog.i18n.DateTimePatterns_ml_IN", "goog.i18n.DateTimePatterns_mr_IN", "goog.i18n.DateTimePatterns_ms_BN", "goog.i18n.DateTimePatterns_ms_MY", "goog.i18n.DateTimePatterns_mt_MT", "goog.i18n.DateTimePatterns_mua", "goog.i18n.DateTimePatterns_mua_CM", "goog.i18n.DateTimePatterns_my", "goog.i18n.DateTimePatterns_my_MM", "goog.i18n.DateTimePatterns_naq", "goog.i18n.DateTimePatterns_naq_NA", "goog.i18n.DateTimePatterns_nb", "goog.i18n.DateTimePatterns_nb_NO", "goog.i18n.DateTimePatterns_nd", "goog.i18n.DateTimePatterns_nd_ZW", "goog.i18n.DateTimePatterns_ne", "goog.i18n.DateTimePatterns_ne_IN", "goog.i18n.DateTimePatterns_ne_NP", "goog.i18n.DateTimePatterns_nl_AW", "goog.i18n.DateTimePatterns_nl_BE", "goog.i18n.DateTimePatterns_nl_NL", "goog.i18n.DateTimePatterns_nmg", "goog.i18n.DateTimePatterns_nmg_CM", "goog.i18n.DateTimePatterns_nn", "goog.i18n.DateTimePatterns_nn_NO", "goog.i18n.DateTimePatterns_nus", "goog.i18n.DateTimePatterns_nus_SD", "goog.i18n.DateTimePatterns_nyn", "goog.i18n.DateTimePatterns_nyn_UG", "goog.i18n.DateTimePatterns_om", "goog.i18n.DateTimePatterns_om_ET", "goog.i18n.DateTimePatterns_om_KE", "goog.i18n.DateTimePatterns_or_IN", "goog.i18n.DateTimePatterns_pa", "goog.i18n.DateTimePatterns_pa_Arab", "goog.i18n.DateTimePatterns_pa_Arab_PK", "goog.i18n.DateTimePatterns_pa_Guru", "goog.i18n.DateTimePatterns_pa_Guru_IN", "goog.i18n.DateTimePatterns_pl_PL", "goog.i18n.DateTimePatterns_ps", "goog.i18n.DateTimePatterns_ps_AF", "goog.i18n.DateTimePatterns_pt_AO", "goog.i18n.DateTimePatterns_pt_GW", "goog.i18n.DateTimePatterns_pt_MZ", "goog.i18n.DateTimePatterns_pt_ST", "goog.i18n.DateTimePatterns_rm", "goog.i18n.DateTimePatterns_rm_CH", "goog.i18n.DateTimePatterns_rn", "goog.i18n.DateTimePatterns_rn_BI", "goog.i18n.DateTimePatterns_ro_MD", "goog.i18n.DateTimePatterns_ro_RO", "goog.i18n.DateTimePatterns_rof", "goog.i18n.DateTimePatterns_rof_TZ", "goog.i18n.DateTimePatterns_ru_MD", "goog.i18n.DateTimePatterns_ru_RU", "goog.i18n.DateTimePatterns_ru_UA", "goog.i18n.DateTimePatterns_rw", "goog.i18n.DateTimePatterns_rw_RW", "goog.i18n.DateTimePatterns_rwk", "goog.i18n.DateTimePatterns_rwk_TZ", "goog.i18n.DateTimePatterns_saq", "goog.i18n.DateTimePatterns_saq_KE", "goog.i18n.DateTimePatterns_sbp", "goog.i18n.DateTimePatterns_sbp_TZ", "goog.i18n.DateTimePatterns_seh", "goog.i18n.DateTimePatterns_seh_MZ", "goog.i18n.DateTimePatterns_ses", "goog.i18n.DateTimePatterns_ses_ML", "goog.i18n.DateTimePatterns_sg", "goog.i18n.DateTimePatterns_sg_CF", "goog.i18n.DateTimePatterns_shi", "goog.i18n.DateTimePatterns_shi_Latn", "goog.i18n.DateTimePatterns_shi_Latn_MA", "goog.i18n.DateTimePatterns_shi_Tfng", "goog.i18n.DateTimePatterns_shi_Tfng_MA", "goog.i18n.DateTimePatterns_si", "goog.i18n.DateTimePatterns_si_LK", "goog.i18n.DateTimePatterns_sk_SK", "goog.i18n.DateTimePatterns_sl_SI", "goog.i18n.DateTimePatterns_sn", "goog.i18n.DateTimePatterns_sn_ZW", "goog.i18n.DateTimePatterns_so", "goog.i18n.DateTimePatterns_so_DJ", "goog.i18n.DateTimePatterns_so_ET", "goog.i18n.DateTimePatterns_so_KE", "goog.i18n.DateTimePatterns_so_SO", "goog.i18n.DateTimePatterns_sq_AL", "goog.i18n.DateTimePatterns_sr_Cyrl", "goog.i18n.DateTimePatterns_sr_Cyrl_BA", "goog.i18n.DateTimePatterns_sr_Cyrl_ME", "goog.i18n.DateTimePatterns_sr_Cyrl_RS", "goog.i18n.DateTimePatterns_sr_Latn", "goog.i18n.DateTimePatterns_sr_Latn_BA", "goog.i18n.DateTimePatterns_sr_Latn_ME", "goog.i18n.DateTimePatterns_sr_Latn_RS", "goog.i18n.DateTimePatterns_sv_FI", "goog.i18n.DateTimePatterns_sv_SE", "goog.i18n.DateTimePatterns_sw_KE", "goog.i18n.DateTimePatterns_sw_TZ", "goog.i18n.DateTimePatterns_swc", "goog.i18n.DateTimePatterns_swc_CD", "goog.i18n.DateTimePatterns_ta_IN", "goog.i18n.DateTimePatterns_ta_LK", "goog.i18n.DateTimePatterns_te_IN", "goog.i18n.DateTimePatterns_teo", "goog.i18n.DateTimePatterns_teo_KE", "goog.i18n.DateTimePatterns_teo_UG", "goog.i18n.DateTimePatterns_th_TH", "goog.i18n.DateTimePatterns_ti", "goog.i18n.DateTimePatterns_ti_ER", "goog.i18n.DateTimePatterns_ti_ET", "goog.i18n.DateTimePatterns_to", "goog.i18n.DateTimePatterns_to_TO", "goog.i18n.DateTimePatterns_tr_TR", "goog.i18n.DateTimePatterns_twq", "goog.i18n.DateTimePatterns_twq_NE", "goog.i18n.DateTimePatterns_tzm", "goog.i18n.DateTimePatterns_tzm_Latn", "goog.i18n.DateTimePatterns_tzm_Latn_MA", "goog.i18n.DateTimePatterns_uk_UA", "goog.i18n.DateTimePatterns_ur_IN", "goog.i18n.DateTimePatterns_ur_PK", "goog.i18n.DateTimePatterns_uz", "goog.i18n.DateTimePatterns_uz_Arab", "goog.i18n.DateTimePatterns_uz_Arab_AF", "goog.i18n.DateTimePatterns_uz_Cyrl", "goog.i18n.DateTimePatterns_uz_Cyrl_UZ", "goog.i18n.DateTimePatterns_uz_Latn", "goog.i18n.DateTimePatterns_uz_Latn_UZ", "goog.i18n.DateTimePatterns_vai", "goog.i18n.DateTimePatterns_vai_Latn", "goog.i18n.DateTimePatterns_vai_Latn_LR", "goog.i18n.DateTimePatterns_vai_Vaii", "goog.i18n.DateTimePatterns_vai_Vaii_LR", "goog.i18n.DateTimePatterns_vi_VN", "goog.i18n.DateTimePatterns_vun", "goog.i18n.DateTimePatterns_vun_TZ", "goog.i18n.DateTimePatterns_xog", "goog.i18n.DateTimePatterns_xog_UG", "goog.i18n.DateTimePatterns_yav", "goog.i18n.DateTimePatterns_yav_CM", "goog.i18n.DateTimePatterns_yo", "goog.i18n.DateTimePatterns_yo_NG", "goog.i18n.DateTimePatterns_zh_Hans", "goog.i18n.DateTimePatterns_zh_Hans_CN", "goog.i18n.DateTimePatterns_zh_Hans_HK", "goog.i18n.DateTimePatterns_zh_Hans_MO", "goog.i18n.DateTimePatterns_zh_Hans_SG", "goog.i18n.DateTimePatterns_zh_Hant", "goog.i18n.DateTimePatterns_zh_Hant_HK", "goog.i18n.DateTimePatterns_zh_Hant_MO", "goog.i18n.DateTimePatterns_zh_Hant_TW", "goog.i18n.DateTimePatterns_zu_ZA"], ["goog.i18n.DateTimePatterns"]);
goog.addDependency("/i18n/datetimesymbols.js", ["goog.i18n.DateTimeSymbols", "goog.i18n.DateTimeSymbols_af", "goog.i18n.DateTimeSymbols_am", "goog.i18n.DateTimeSymbols_ar", "goog.i18n.DateTimeSymbols_bg", "goog.i18n.DateTimeSymbols_bn", "goog.i18n.DateTimeSymbols_ca", "goog.i18n.DateTimeSymbols_cs", "goog.i18n.DateTimeSymbols_da", "goog.i18n.DateTimeSymbols_de", "goog.i18n.DateTimeSymbols_de_AT", "goog.i18n.DateTimeSymbols_de_CH", "goog.i18n.DateTimeSymbols_el", "goog.i18n.DateTimeSymbols_en", "goog.i18n.DateTimeSymbols_en_AU", "goog.i18n.DateTimeSymbols_en_GB", "goog.i18n.DateTimeSymbols_en_IE", "goog.i18n.DateTimeSymbols_en_IN", "goog.i18n.DateTimeSymbols_en_ISO", "goog.i18n.DateTimeSymbols_en_SG", "goog.i18n.DateTimeSymbols_en_US", "goog.i18n.DateTimeSymbols_en_ZA", "goog.i18n.DateTimeSymbols_es", "goog.i18n.DateTimeSymbols_es_419", "goog.i18n.DateTimeSymbols_et", "goog.i18n.DateTimeSymbols_eu", "goog.i18n.DateTimeSymbols_fa", "goog.i18n.DateTimeSymbols_fi", "goog.i18n.DateTimeSymbols_fil", "goog.i18n.DateTimeSymbols_fr", "goog.i18n.DateTimeSymbols_fr_CA", "goog.i18n.DateTimeSymbols_gl", "goog.i18n.DateTimeSymbols_gsw", "goog.i18n.DateTimeSymbols_gu", "goog.i18n.DateTimeSymbols_he", "goog.i18n.DateTimeSymbols_hi", "goog.i18n.DateTimeSymbols_hr", "goog.i18n.DateTimeSymbols_hu", "goog.i18n.DateTimeSymbols_id", "goog.i18n.DateTimeSymbols_in", "goog.i18n.DateTimeSymbols_is", "goog.i18n.DateTimeSymbols_it", "goog.i18n.DateTimeSymbols_iw", "goog.i18n.DateTimeSymbols_ja", "goog.i18n.DateTimeSymbols_kn", "goog.i18n.DateTimeSymbols_ko", "goog.i18n.DateTimeSymbols_ln", "goog.i18n.DateTimeSymbols_lt", "goog.i18n.DateTimeSymbols_lv", "goog.i18n.DateTimeSymbols_ml", "goog.i18n.DateTimeSymbols_mr", "goog.i18n.DateTimeSymbols_ms", "goog.i18n.DateTimeSymbols_mt", "goog.i18n.DateTimeSymbols_nl", "goog.i18n.DateTimeSymbols_no", "goog.i18n.DateTimeSymbols_or", "goog.i18n.DateTimeSymbols_pl", "goog.i18n.DateTimeSymbols_pt", "goog.i18n.DateTimeSymbols_pt_BR", "goog.i18n.DateTimeSymbols_pt_PT", "goog.i18n.DateTimeSymbols_ro", "goog.i18n.DateTimeSymbols_ru", "goog.i18n.DateTimeSymbols_sk", "goog.i18n.DateTimeSymbols_sl", "goog.i18n.DateTimeSymbols_sq", "goog.i18n.DateTimeSymbols_sr", "goog.i18n.DateTimeSymbols_sv", "goog.i18n.DateTimeSymbols_sw", "goog.i18n.DateTimeSymbols_ta", "goog.i18n.DateTimeSymbols_te", "goog.i18n.DateTimeSymbols_th", "goog.i18n.DateTimeSymbols_tl", "goog.i18n.DateTimeSymbols_tr", "goog.i18n.DateTimeSymbols_uk", "goog.i18n.DateTimeSymbols_ur", "goog.i18n.DateTimeSymbols_vi", "goog.i18n.DateTimeSymbols_zh", "goog.i18n.DateTimeSymbols_zh_CN", "goog.i18n.DateTimeSymbols_zh_HK", "goog.i18n.DateTimeSymbols_zh_TW", "goog.i18n.DateTimeSymbols_zu"], []);
goog.addDependency("/i18n/datetimesymbolsext.js", ["goog.i18n.DateTimeSymbolsExt", "goog.i18n.DateTimeSymbols_aa", "goog.i18n.DateTimeSymbols_aa_DJ", "goog.i18n.DateTimeSymbols_aa_ER", "goog.i18n.DateTimeSymbols_aa_ET", "goog.i18n.DateTimeSymbols_af_NA", "goog.i18n.DateTimeSymbols_af_ZA", "goog.i18n.DateTimeSymbols_agq", "goog.i18n.DateTimeSymbols_agq_CM", "goog.i18n.DateTimeSymbols_ak", "goog.i18n.DateTimeSymbols_ak_GH", "goog.i18n.DateTimeSymbols_am_ET", "goog.i18n.DateTimeSymbols_ar_AE", "goog.i18n.DateTimeSymbols_ar_BH", "goog.i18n.DateTimeSymbols_ar_DZ", "goog.i18n.DateTimeSymbols_ar_EG", "goog.i18n.DateTimeSymbols_ar_IQ", "goog.i18n.DateTimeSymbols_ar_JO", "goog.i18n.DateTimeSymbols_ar_KW", "goog.i18n.DateTimeSymbols_ar_LB", "goog.i18n.DateTimeSymbols_ar_LY", "goog.i18n.DateTimeSymbols_ar_MA", "goog.i18n.DateTimeSymbols_ar_OM", "goog.i18n.DateTimeSymbols_ar_QA", "goog.i18n.DateTimeSymbols_ar_SA", "goog.i18n.DateTimeSymbols_ar_SD", "goog.i18n.DateTimeSymbols_ar_SY", "goog.i18n.DateTimeSymbols_ar_TN", "goog.i18n.DateTimeSymbols_ar_YE", "goog.i18n.DateTimeSymbols_as", "goog.i18n.DateTimeSymbols_as_IN", "goog.i18n.DateTimeSymbols_asa", "goog.i18n.DateTimeSymbols_asa_TZ", "goog.i18n.DateTimeSymbols_az", "goog.i18n.DateTimeSymbols_az_Cyrl", "goog.i18n.DateTimeSymbols_az_Cyrl_AZ", "goog.i18n.DateTimeSymbols_az_Latn", "goog.i18n.DateTimeSymbols_az_Latn_AZ", "goog.i18n.DateTimeSymbols_bas", "goog.i18n.DateTimeSymbols_bas_CM", "goog.i18n.DateTimeSymbols_be", "goog.i18n.DateTimeSymbols_be_BY", "goog.i18n.DateTimeSymbols_bem", "goog.i18n.DateTimeSymbols_bem_ZM", "goog.i18n.DateTimeSymbols_bez", "goog.i18n.DateTimeSymbols_bez_TZ", "goog.i18n.DateTimeSymbols_bg_BG", "goog.i18n.DateTimeSymbols_bm", "goog.i18n.DateTimeSymbols_bm_ML", "goog.i18n.DateTimeSymbols_bn_BD", "goog.i18n.DateTimeSymbols_bn_IN", "goog.i18n.DateTimeSymbols_bo", "goog.i18n.DateTimeSymbols_bo_CN", "goog.i18n.DateTimeSymbols_bo_IN", "goog.i18n.DateTimeSymbols_br", "goog.i18n.DateTimeSymbols_br_FR", "goog.i18n.DateTimeSymbols_brx", "goog.i18n.DateTimeSymbols_brx_IN", "goog.i18n.DateTimeSymbols_bs", "goog.i18n.DateTimeSymbols_bs_BA", "goog.i18n.DateTimeSymbols_byn", "goog.i18n.DateTimeSymbols_byn_ER", "goog.i18n.DateTimeSymbols_ca_ES", "goog.i18n.DateTimeSymbols_cch", "goog.i18n.DateTimeSymbols_cch_NG", "goog.i18n.DateTimeSymbols_cgg", "goog.i18n.DateTimeSymbols_cgg_UG", "goog.i18n.DateTimeSymbols_chr", "goog.i18n.DateTimeSymbols_chr_US", "goog.i18n.DateTimeSymbols_ckb", "goog.i18n.DateTimeSymbols_ckb_Arab", "goog.i18n.DateTimeSymbols_ckb_Arab_IQ", "goog.i18n.DateTimeSymbols_ckb_Arab_IR", "goog.i18n.DateTimeSymbols_ckb_IQ", "goog.i18n.DateTimeSymbols_ckb_IR", "goog.i18n.DateTimeSymbols_ckb_Latn", "goog.i18n.DateTimeSymbols_ckb_Latn_IQ", "goog.i18n.DateTimeSymbols_cs_CZ", "goog.i18n.DateTimeSymbols_cy", "goog.i18n.DateTimeSymbols_cy_GB", "goog.i18n.DateTimeSymbols_da_DK", "goog.i18n.DateTimeSymbols_dav", "goog.i18n.DateTimeSymbols_dav_KE", "goog.i18n.DateTimeSymbols_de_BE", "goog.i18n.DateTimeSymbols_de_DE", "goog.i18n.DateTimeSymbols_de_LI", "goog.i18n.DateTimeSymbols_de_LU", "goog.i18n.DateTimeSymbols_dje", "goog.i18n.DateTimeSymbols_dje_NE", "goog.i18n.DateTimeSymbols_dua", "goog.i18n.DateTimeSymbols_dua_CM", "goog.i18n.DateTimeSymbols_dyo", "goog.i18n.DateTimeSymbols_dyo_SN", "goog.i18n.DateTimeSymbols_dz", "goog.i18n.DateTimeSymbols_dz_BT", "goog.i18n.DateTimeSymbols_ebu", "goog.i18n.DateTimeSymbols_ebu_KE", "goog.i18n.DateTimeSymbols_ee", "goog.i18n.DateTimeSymbols_ee_GH", "goog.i18n.DateTimeSymbols_ee_TG", "goog.i18n.DateTimeSymbols_el_CY", "goog.i18n.DateTimeSymbols_el_GR", "goog.i18n.DateTimeSymbols_el_POLYTON", "goog.i18n.DateTimeSymbols_en_AS", "goog.i18n.DateTimeSymbols_en_BB", "goog.i18n.DateTimeSymbols_en_BE", "goog.i18n.DateTimeSymbols_en_BM", "goog.i18n.DateTimeSymbols_en_BW", "goog.i18n.DateTimeSymbols_en_BZ", "goog.i18n.DateTimeSymbols_en_CA", "goog.i18n.DateTimeSymbols_en_Dsrt", "goog.i18n.DateTimeSymbols_en_Dsrt_US", "goog.i18n.DateTimeSymbols_en_GU", "goog.i18n.DateTimeSymbols_en_GY", "goog.i18n.DateTimeSymbols_en_HK", "goog.i18n.DateTimeSymbols_en_JM", "goog.i18n.DateTimeSymbols_en_MH", "goog.i18n.DateTimeSymbols_en_MP", "goog.i18n.DateTimeSymbols_en_MT", "goog.i18n.DateTimeSymbols_en_MU", "goog.i18n.DateTimeSymbols_en_NA", "goog.i18n.DateTimeSymbols_en_NZ", "goog.i18n.DateTimeSymbols_en_PH", "goog.i18n.DateTimeSymbols_en_PK", "goog.i18n.DateTimeSymbols_en_Shaw", "goog.i18n.DateTimeSymbols_en_TT", "goog.i18n.DateTimeSymbols_en_UM", "goog.i18n.DateTimeSymbols_en_VI", "goog.i18n.DateTimeSymbols_en_ZW", "goog.i18n.DateTimeSymbols_eo", "goog.i18n.DateTimeSymbols_es_AR", "goog.i18n.DateTimeSymbols_es_BO", "goog.i18n.DateTimeSymbols_es_CL", "goog.i18n.DateTimeSymbols_es_CO", "goog.i18n.DateTimeSymbols_es_CR", "goog.i18n.DateTimeSymbols_es_DO", "goog.i18n.DateTimeSymbols_es_EC", "goog.i18n.DateTimeSymbols_es_ES", "goog.i18n.DateTimeSymbols_es_GQ", "goog.i18n.DateTimeSymbols_es_GT", "goog.i18n.DateTimeSymbols_es_HN", "goog.i18n.DateTimeSymbols_es_MX", "goog.i18n.DateTimeSymbols_es_NI", "goog.i18n.DateTimeSymbols_es_PA", "goog.i18n.DateTimeSymbols_es_PE", "goog.i18n.DateTimeSymbols_es_PR", "goog.i18n.DateTimeSymbols_es_PY", "goog.i18n.DateTimeSymbols_es_SV", "goog.i18n.DateTimeSymbols_es_US", "goog.i18n.DateTimeSymbols_es_UY", "goog.i18n.DateTimeSymbols_es_VE", "goog.i18n.DateTimeSymbols_et_EE", "goog.i18n.DateTimeSymbols_eu_ES", "goog.i18n.DateTimeSymbols_ewo", "goog.i18n.DateTimeSymbols_ewo_CM", "goog.i18n.DateTimeSymbols_fa_AF", "goog.i18n.DateTimeSymbols_fa_IR", "goog.i18n.DateTimeSymbols_ff", "goog.i18n.DateTimeSymbols_ff_SN", "goog.i18n.DateTimeSymbols_fi_FI", "goog.i18n.DateTimeSymbols_fil_PH", "goog.i18n.DateTimeSymbols_fo", "goog.i18n.DateTimeSymbols_fo_FO", "goog.i18n.DateTimeSymbols_fr_BE", "goog.i18n.DateTimeSymbols_fr_BF", "goog.i18n.DateTimeSymbols_fr_BI", "goog.i18n.DateTimeSymbols_fr_BJ", "goog.i18n.DateTimeSymbols_fr_BL", "goog.i18n.DateTimeSymbols_fr_CD", "goog.i18n.DateTimeSymbols_fr_CF", "goog.i18n.DateTimeSymbols_fr_CG", "goog.i18n.DateTimeSymbols_fr_CH", "goog.i18n.DateTimeSymbols_fr_CI", "goog.i18n.DateTimeSymbols_fr_CM", "goog.i18n.DateTimeSymbols_fr_DJ", "goog.i18n.DateTimeSymbols_fr_FR", "goog.i18n.DateTimeSymbols_fr_GA", "goog.i18n.DateTimeSymbols_fr_GF", "goog.i18n.DateTimeSymbols_fr_GN", "goog.i18n.DateTimeSymbols_fr_GP", "goog.i18n.DateTimeSymbols_fr_GQ", "goog.i18n.DateTimeSymbols_fr_KM", "goog.i18n.DateTimeSymbols_fr_LU", "goog.i18n.DateTimeSymbols_fr_MC", "goog.i18n.DateTimeSymbols_fr_MF", "goog.i18n.DateTimeSymbols_fr_MG", "goog.i18n.DateTimeSymbols_fr_ML", "goog.i18n.DateTimeSymbols_fr_MQ", "goog.i18n.DateTimeSymbols_fr_NE", "goog.i18n.DateTimeSymbols_fr_RE", "goog.i18n.DateTimeSymbols_fr_RW", "goog.i18n.DateTimeSymbols_fr_SN", "goog.i18n.DateTimeSymbols_fr_TD", "goog.i18n.DateTimeSymbols_fr_TG", "goog.i18n.DateTimeSymbols_fr_YT", "goog.i18n.DateTimeSymbols_fur", "goog.i18n.DateTimeSymbols_fur_IT", "goog.i18n.DateTimeSymbols_ga", "goog.i18n.DateTimeSymbols_ga_IE", "goog.i18n.DateTimeSymbols_gaa", "goog.i18n.DateTimeSymbols_gaa_GH", "goog.i18n.DateTimeSymbols_gl_ES", "goog.i18n.DateTimeSymbols_gsw_CH", "goog.i18n.DateTimeSymbols_gu_IN", "goog.i18n.DateTimeSymbols_guz", "goog.i18n.DateTimeSymbols_guz_KE", "goog.i18n.DateTimeSymbols_gv", "goog.i18n.DateTimeSymbols_gv_GB", "goog.i18n.DateTimeSymbols_ha", "goog.i18n.DateTimeSymbols_ha_Latn", "goog.i18n.DateTimeSymbols_ha_Latn_GH", "goog.i18n.DateTimeSymbols_ha_Latn_NE", "goog.i18n.DateTimeSymbols_ha_Latn_NG", "goog.i18n.DateTimeSymbols_haw", "goog.i18n.DateTimeSymbols_haw_US", "goog.i18n.DateTimeSymbols_he_IL", "goog.i18n.DateTimeSymbols_hi_IN", "goog.i18n.DateTimeSymbols_hr_HR", "goog.i18n.DateTimeSymbols_hu_HU", "goog.i18n.DateTimeSymbols_hy", "goog.i18n.DateTimeSymbols_hy_AM", "goog.i18n.DateTimeSymbols_ia", "goog.i18n.DateTimeSymbols_id_ID", "goog.i18n.DateTimeSymbols_ig", "goog.i18n.DateTimeSymbols_ig_NG", "goog.i18n.DateTimeSymbols_ii", "goog.i18n.DateTimeSymbols_ii_CN", "goog.i18n.DateTimeSymbols_is_IS", "goog.i18n.DateTimeSymbols_it_CH", "goog.i18n.DateTimeSymbols_it_IT", "goog.i18n.DateTimeSymbols_ja_JP", "goog.i18n.DateTimeSymbols_jmc", "goog.i18n.DateTimeSymbols_jmc_TZ", "goog.i18n.DateTimeSymbols_ka", "goog.i18n.DateTimeSymbols_ka_GE", "goog.i18n.DateTimeSymbols_kab", "goog.i18n.DateTimeSymbols_kab_DZ", "goog.i18n.DateTimeSymbols_kaj", "goog.i18n.DateTimeSymbols_kaj_NG", "goog.i18n.DateTimeSymbols_kam", "goog.i18n.DateTimeSymbols_kam_KE", "goog.i18n.DateTimeSymbols_kcg", "goog.i18n.DateTimeSymbols_kcg_NG", "goog.i18n.DateTimeSymbols_kde", "goog.i18n.DateTimeSymbols_kde_TZ", "goog.i18n.DateTimeSymbols_kea", "goog.i18n.DateTimeSymbols_kea_CV", "goog.i18n.DateTimeSymbols_khq", "goog.i18n.DateTimeSymbols_khq_ML", "goog.i18n.DateTimeSymbols_ki", "goog.i18n.DateTimeSymbols_ki_KE", "goog.i18n.DateTimeSymbols_kk", "goog.i18n.DateTimeSymbols_kk_Cyrl", "goog.i18n.DateTimeSymbols_kk_Cyrl_KZ", "goog.i18n.DateTimeSymbols_kl", "goog.i18n.DateTimeSymbols_kl_GL", "goog.i18n.DateTimeSymbols_kln", "goog.i18n.DateTimeSymbols_kln_KE", "goog.i18n.DateTimeSymbols_km", "goog.i18n.DateTimeSymbols_km_KH", "goog.i18n.DateTimeSymbols_kn_IN", "goog.i18n.DateTimeSymbols_ko_KR", "goog.i18n.DateTimeSymbols_kok", "goog.i18n.DateTimeSymbols_kok_IN", "goog.i18n.DateTimeSymbols_ksb", "goog.i18n.DateTimeSymbols_ksb_TZ", "goog.i18n.DateTimeSymbols_ksf", "goog.i18n.DateTimeSymbols_ksf_CM", "goog.i18n.DateTimeSymbols_ksh", "goog.i18n.DateTimeSymbols_ksh_DE", "goog.i18n.DateTimeSymbols_ku", "goog.i18n.DateTimeSymbols_ku_Arab", "goog.i18n.DateTimeSymbols_ku_Arab_IQ", "goog.i18n.DateTimeSymbols_ku_Arab_IR", "goog.i18n.DateTimeSymbols_ku_Latn", "goog.i18n.DateTimeSymbols_ku_Latn_SY", "goog.i18n.DateTimeSymbols_ku_Latn_TR", "goog.i18n.DateTimeSymbols_kw", "goog.i18n.DateTimeSymbols_kw_GB", "goog.i18n.DateTimeSymbols_ky", "goog.i18n.DateTimeSymbols_ky_KG", "goog.i18n.DateTimeSymbols_lag", "goog.i18n.DateTimeSymbols_lag_TZ", "goog.i18n.DateTimeSymbols_lg", "goog.i18n.DateTimeSymbols_lg_UG", "goog.i18n.DateTimeSymbols_ln_CD", "goog.i18n.DateTimeSymbols_ln_CG", "goog.i18n.DateTimeSymbols_lo", "goog.i18n.DateTimeSymbols_lo_LA", "goog.i18n.DateTimeSymbols_lt_LT", "goog.i18n.DateTimeSymbols_lu", "goog.i18n.DateTimeSymbols_lu_CD", "goog.i18n.DateTimeSymbols_luo", "goog.i18n.DateTimeSymbols_luo_KE", "goog.i18n.DateTimeSymbols_luy", "goog.i18n.DateTimeSymbols_luy_KE", "goog.i18n.DateTimeSymbols_lv_LV", "goog.i18n.DateTimeSymbols_mas", "goog.i18n.DateTimeSymbols_mas_KE", "goog.i18n.DateTimeSymbols_mas_TZ", "goog.i18n.DateTimeSymbols_mer", "goog.i18n.DateTimeSymbols_mer_KE", "goog.i18n.DateTimeSymbols_mfe", "goog.i18n.DateTimeSymbols_mfe_MU", "goog.i18n.DateTimeSymbols_mg", "goog.i18n.DateTimeSymbols_mg_MG", "goog.i18n.DateTimeSymbols_mgh", "goog.i18n.DateTimeSymbols_mgh_MZ", "goog.i18n.DateTimeSymbols_mk", "goog.i18n.DateTimeSymbols_mk_MK", "goog.i18n.DateTimeSymbols_ml_IN", "goog.i18n.DateTimeSymbols_mn", "goog.i18n.DateTimeSymbols_mn_Cyrl", "goog.i18n.DateTimeSymbols_mn_Cyrl_MN", "goog.i18n.DateTimeSymbols_mn_Mong", "goog.i18n.DateTimeSymbols_mn_Mong_CN", "goog.i18n.DateTimeSymbols_mr_IN", "goog.i18n.DateTimeSymbols_ms_BN", "goog.i18n.DateTimeSymbols_ms_MY", "goog.i18n.DateTimeSymbols_mt_MT", "goog.i18n.DateTimeSymbols_mua", "goog.i18n.DateTimeSymbols_mua_CM", "goog.i18n.DateTimeSymbols_my", "goog.i18n.DateTimeSymbols_my_MM", "goog.i18n.DateTimeSymbols_naq", "goog.i18n.DateTimeSymbols_naq_NA", "goog.i18n.DateTimeSymbols_nb", "goog.i18n.DateTimeSymbols_nb_NO", "goog.i18n.DateTimeSymbols_nd", "goog.i18n.DateTimeSymbols_nd_ZW", "goog.i18n.DateTimeSymbols_nds", "goog.i18n.DateTimeSymbols_nds_DE", "goog.i18n.DateTimeSymbols_ne", "goog.i18n.DateTimeSymbols_ne_IN", "goog.i18n.DateTimeSymbols_ne_NP", "goog.i18n.DateTimeSymbols_nl_AW", "goog.i18n.DateTimeSymbols_nl_BE", "goog.i18n.DateTimeSymbols_nl_NL", "goog.i18n.DateTimeSymbols_nmg", "goog.i18n.DateTimeSymbols_nmg_CM", "goog.i18n.DateTimeSymbols_nn", "goog.i18n.DateTimeSymbols_nn_NO", "goog.i18n.DateTimeSymbols_nr", "goog.i18n.DateTimeSymbols_nr_ZA", "goog.i18n.DateTimeSymbols_nso", "goog.i18n.DateTimeSymbols_nso_ZA", "goog.i18n.DateTimeSymbols_nus", "goog.i18n.DateTimeSymbols_nus_SD", "goog.i18n.DateTimeSymbols_nyn", "goog.i18n.DateTimeSymbols_nyn_UG", "goog.i18n.DateTimeSymbols_oc", "goog.i18n.DateTimeSymbols_oc_FR", "goog.i18n.DateTimeSymbols_om", "goog.i18n.DateTimeSymbols_om_ET", "goog.i18n.DateTimeSymbols_om_KE", "goog.i18n.DateTimeSymbols_or_IN", "goog.i18n.DateTimeSymbols_pa", "goog.i18n.DateTimeSymbols_pa_Arab", "goog.i18n.DateTimeSymbols_pa_Arab_PK", "goog.i18n.DateTimeSymbols_pa_Guru", "goog.i18n.DateTimeSymbols_pa_Guru_IN", "goog.i18n.DateTimeSymbols_pl_PL", "goog.i18n.DateTimeSymbols_ps", "goog.i18n.DateTimeSymbols_ps_AF", "goog.i18n.DateTimeSymbols_pt_AO", "goog.i18n.DateTimeSymbols_pt_GW", "goog.i18n.DateTimeSymbols_pt_MZ", "goog.i18n.DateTimeSymbols_pt_ST", "goog.i18n.DateTimeSymbols_rm", "goog.i18n.DateTimeSymbols_rm_CH", "goog.i18n.DateTimeSymbols_rn", "goog.i18n.DateTimeSymbols_rn_BI", "goog.i18n.DateTimeSymbols_ro_MD", "goog.i18n.DateTimeSymbols_ro_RO", "goog.i18n.DateTimeSymbols_rof", "goog.i18n.DateTimeSymbols_rof_TZ", "goog.i18n.DateTimeSymbols_ru_MD", "goog.i18n.DateTimeSymbols_ru_RU", "goog.i18n.DateTimeSymbols_ru_UA", "goog.i18n.DateTimeSymbols_rw", "goog.i18n.DateTimeSymbols_rw_RW", "goog.i18n.DateTimeSymbols_rwk", "goog.i18n.DateTimeSymbols_rwk_TZ", "goog.i18n.DateTimeSymbols_sah", "goog.i18n.DateTimeSymbols_sah_RU", "goog.i18n.DateTimeSymbols_saq", "goog.i18n.DateTimeSymbols_saq_KE", "goog.i18n.DateTimeSymbols_sbp", "goog.i18n.DateTimeSymbols_sbp_TZ", "goog.i18n.DateTimeSymbols_se", "goog.i18n.DateTimeSymbols_se_FI", "goog.i18n.DateTimeSymbols_se_NO", "goog.i18n.DateTimeSymbols_seh", "goog.i18n.DateTimeSymbols_seh_MZ", "goog.i18n.DateTimeSymbols_ses", "goog.i18n.DateTimeSymbols_ses_ML", "goog.i18n.DateTimeSymbols_sg", "goog.i18n.DateTimeSymbols_sg_CF", "goog.i18n.DateTimeSymbols_shi", "goog.i18n.DateTimeSymbols_shi_Latn", "goog.i18n.DateTimeSymbols_shi_Latn_MA", "goog.i18n.DateTimeSymbols_shi_Tfng", "goog.i18n.DateTimeSymbols_shi_Tfng_MA", "goog.i18n.DateTimeSymbols_si", "goog.i18n.DateTimeSymbols_si_LK", "goog.i18n.DateTimeSymbols_sid", "goog.i18n.DateTimeSymbols_sid_ET", "goog.i18n.DateTimeSymbols_sk_SK", "goog.i18n.DateTimeSymbols_sl_SI", "goog.i18n.DateTimeSymbols_sn", "goog.i18n.DateTimeSymbols_sn_ZW", "goog.i18n.DateTimeSymbols_so", "goog.i18n.DateTimeSymbols_so_DJ", "goog.i18n.DateTimeSymbols_so_ET", "goog.i18n.DateTimeSymbols_so_KE", "goog.i18n.DateTimeSymbols_so_SO", "goog.i18n.DateTimeSymbols_sq_AL", "goog.i18n.DateTimeSymbols_sr_Cyrl", "goog.i18n.DateTimeSymbols_sr_Cyrl_BA", "goog.i18n.DateTimeSymbols_sr_Cyrl_ME", "goog.i18n.DateTimeSymbols_sr_Cyrl_RS", "goog.i18n.DateTimeSymbols_sr_Latn", "goog.i18n.DateTimeSymbols_sr_Latn_BA", "goog.i18n.DateTimeSymbols_sr_Latn_ME", "goog.i18n.DateTimeSymbols_sr_Latn_RS", "goog.i18n.DateTimeSymbols_ss", "goog.i18n.DateTimeSymbols_ss_SZ", "goog.i18n.DateTimeSymbols_ss_ZA", "goog.i18n.DateTimeSymbols_ssy", "goog.i18n.DateTimeSymbols_ssy_ER", "goog.i18n.DateTimeSymbols_st", "goog.i18n.DateTimeSymbols_st_LS", "goog.i18n.DateTimeSymbols_st_ZA", "goog.i18n.DateTimeSymbols_sv_FI", "goog.i18n.DateTimeSymbols_sv_SE", "goog.i18n.DateTimeSymbols_sw_KE", "goog.i18n.DateTimeSymbols_sw_TZ", "goog.i18n.DateTimeSymbols_swc", "goog.i18n.DateTimeSymbols_swc_CD", "goog.i18n.DateTimeSymbols_ta_IN", "goog.i18n.DateTimeSymbols_ta_LK", "goog.i18n.DateTimeSymbols_te_IN", "goog.i18n.DateTimeSymbols_teo", "goog.i18n.DateTimeSymbols_teo_KE", "goog.i18n.DateTimeSymbols_teo_UG", "goog.i18n.DateTimeSymbols_tg", "goog.i18n.DateTimeSymbols_tg_Cyrl", "goog.i18n.DateTimeSymbols_tg_Cyrl_TJ", "goog.i18n.DateTimeSymbols_th_TH", "goog.i18n.DateTimeSymbols_ti", "goog.i18n.DateTimeSymbols_ti_ER", "goog.i18n.DateTimeSymbols_ti_ET", "goog.i18n.DateTimeSymbols_tig", "goog.i18n.DateTimeSymbols_tig_ER", "goog.i18n.DateTimeSymbols_tn", "goog.i18n.DateTimeSymbols_tn_ZA", "goog.i18n.DateTimeSymbols_to", "goog.i18n.DateTimeSymbols_to_TO", "goog.i18n.DateTimeSymbols_tr_TR", "goog.i18n.DateTimeSymbols_trv", "goog.i18n.DateTimeSymbols_trv_TW", "goog.i18n.DateTimeSymbols_ts", "goog.i18n.DateTimeSymbols_ts_ZA", "goog.i18n.DateTimeSymbols_twq", "goog.i18n.DateTimeSymbols_twq_NE", "goog.i18n.DateTimeSymbols_tzm", "goog.i18n.DateTimeSymbols_tzm_Latn", "goog.i18n.DateTimeSymbols_tzm_Latn_MA", "goog.i18n.DateTimeSymbols_uk_UA", "goog.i18n.DateTimeSymbols_ur_IN", "goog.i18n.DateTimeSymbols_ur_PK", "goog.i18n.DateTimeSymbols_uz", "goog.i18n.DateTimeSymbols_uz_Arab", "goog.i18n.DateTimeSymbols_uz_Arab_AF", "goog.i18n.DateTimeSymbols_uz_Cyrl", "goog.i18n.DateTimeSymbols_uz_Cyrl_UZ", "goog.i18n.DateTimeSymbols_uz_Latn", "goog.i18n.DateTimeSymbols_uz_Latn_UZ", "goog.i18n.DateTimeSymbols_vai", "goog.i18n.DateTimeSymbols_vai_Latn", "goog.i18n.DateTimeSymbols_vai_Latn_LR", "goog.i18n.DateTimeSymbols_vai_Vaii", "goog.i18n.DateTimeSymbols_vai_Vaii_LR", "goog.i18n.DateTimeSymbols_ve", "goog.i18n.DateTimeSymbols_ve_ZA", "goog.i18n.DateTimeSymbols_vi_VN", "goog.i18n.DateTimeSymbols_vun", "goog.i18n.DateTimeSymbols_vun_TZ", "goog.i18n.DateTimeSymbols_wae", "goog.i18n.DateTimeSymbols_wae_CH", "goog.i18n.DateTimeSymbols_wal", "goog.i18n.DateTimeSymbols_wal_ET", "goog.i18n.DateTimeSymbols_xh", "goog.i18n.DateTimeSymbols_xh_ZA", "goog.i18n.DateTimeSymbols_xog", "goog.i18n.DateTimeSymbols_xog_UG", "goog.i18n.DateTimeSymbols_yav", "goog.i18n.DateTimeSymbols_yav_CM", "goog.i18n.DateTimeSymbols_yo", "goog.i18n.DateTimeSymbols_yo_NG", "goog.i18n.DateTimeSymbols_zh_Hans", "goog.i18n.DateTimeSymbols_zh_Hans_CN", "goog.i18n.DateTimeSymbols_zh_Hans_HK", "goog.i18n.DateTimeSymbols_zh_Hans_MO", "goog.i18n.DateTimeSymbols_zh_Hans_SG", "goog.i18n.DateTimeSymbols_zh_Hant", "goog.i18n.DateTimeSymbols_zh_Hant_HK", "goog.i18n.DateTimeSymbols_zh_Hant_MO", "goog.i18n.DateTimeSymbols_zh_Hant_TW", "goog.i18n.DateTimeSymbols_zu_ZA"], ["goog.i18n.DateTimeSymbols"]);
goog.addDependency("/i18n/graphemebreak.js", ["goog.i18n.GraphemeBreak"], ["goog.structs.InversionMap"]);
goog.addDependency("/i18n/messageformat.js", ["goog.i18n.MessageFormat"], ["goog.asserts", "goog.i18n.NumberFormat", "goog.i18n.pluralRules"]);
goog.addDependency("/i18n/mime.js", ["goog.i18n.mime", "goog.i18n.mime.encode"], []);
goog.addDependency("/i18n/numberformat.js", ["goog.i18n.NumberFormat", "goog.i18n.NumberFormat.CurrencyStyle", "goog.i18n.NumberFormat.Format"], ["goog.i18n.NumberFormatSymbols", "goog.i18n.currency"]);
goog.addDependency("/i18n/numberformatsymbols.js", ["goog.i18n.NumberFormatSymbols", "goog.i18n.NumberFormatSymbols_af", "goog.i18n.NumberFormatSymbols_af_ZA", "goog.i18n.NumberFormatSymbols_am", "goog.i18n.NumberFormatSymbols_am_ET", "goog.i18n.NumberFormatSymbols_ar", "goog.i18n.NumberFormatSymbols_ar_EG", "goog.i18n.NumberFormatSymbols_bg", "goog.i18n.NumberFormatSymbols_bg_BG", "goog.i18n.NumberFormatSymbols_bn", "goog.i18n.NumberFormatSymbols_bn_BD", "goog.i18n.NumberFormatSymbols_ca", "goog.i18n.NumberFormatSymbols_ca_ES", "goog.i18n.NumberFormatSymbols_cs", "goog.i18n.NumberFormatSymbols_cs_CZ", "goog.i18n.NumberFormatSymbols_da", "goog.i18n.NumberFormatSymbols_da_DK", "goog.i18n.NumberFormatSymbols_de", "goog.i18n.NumberFormatSymbols_de_AT", "goog.i18n.NumberFormatSymbols_de_BE", "goog.i18n.NumberFormatSymbols_de_CH", "goog.i18n.NumberFormatSymbols_de_DE", "goog.i18n.NumberFormatSymbols_de_LU", "goog.i18n.NumberFormatSymbols_el", "goog.i18n.NumberFormatSymbols_el_GR", "goog.i18n.NumberFormatSymbols_el_POLYTON", "goog.i18n.NumberFormatSymbols_en", "goog.i18n.NumberFormatSymbols_en_AS", "goog.i18n.NumberFormatSymbols_en_AU", "goog.i18n.NumberFormatSymbols_en_Dsrt", "goog.i18n.NumberFormatSymbols_en_Dsrt_US", "goog.i18n.NumberFormatSymbols_en_GB", "goog.i18n.NumberFormatSymbols_en_GU", "goog.i18n.NumberFormatSymbols_en_IE", "goog.i18n.NumberFormatSymbols_en_IN", "goog.i18n.NumberFormatSymbols_en_MH", "goog.i18n.NumberFormatSymbols_en_MP", "goog.i18n.NumberFormatSymbols_en_SG", "goog.i18n.NumberFormatSymbols_en_UM", "goog.i18n.NumberFormatSymbols_en_US", "goog.i18n.NumberFormatSymbols_en_VI", "goog.i18n.NumberFormatSymbols_en_ZA", "goog.i18n.NumberFormatSymbols_es", "goog.i18n.NumberFormatSymbols_es_419", "goog.i18n.NumberFormatSymbols_es_ES", "goog.i18n.NumberFormatSymbols_et", "goog.i18n.NumberFormatSymbols_et_EE", "goog.i18n.NumberFormatSymbols_eu", "goog.i18n.NumberFormatSymbols_eu_ES", "goog.i18n.NumberFormatSymbols_fa", "goog.i18n.NumberFormatSymbols_fa_IR", "goog.i18n.NumberFormatSymbols_fi", "goog.i18n.NumberFormatSymbols_fi_FI", "goog.i18n.NumberFormatSymbols_fil", "goog.i18n.NumberFormatSymbols_fil_PH", "goog.i18n.NumberFormatSymbols_fr", "goog.i18n.NumberFormatSymbols_fr_BL", "goog.i18n.NumberFormatSymbols_fr_CA", "goog.i18n.NumberFormatSymbols_fr_FR", "goog.i18n.NumberFormatSymbols_fr_GF", "goog.i18n.NumberFormatSymbols_fr_GP", "goog.i18n.NumberFormatSymbols_fr_MC", "goog.i18n.NumberFormatSymbols_fr_MF", "goog.i18n.NumberFormatSymbols_fr_MQ", "goog.i18n.NumberFormatSymbols_fr_RE", "goog.i18n.NumberFormatSymbols_fr_YT", "goog.i18n.NumberFormatSymbols_gl", "goog.i18n.NumberFormatSymbols_gl_ES", "goog.i18n.NumberFormatSymbols_gsw", "goog.i18n.NumberFormatSymbols_gsw_CH", "goog.i18n.NumberFormatSymbols_gu", "goog.i18n.NumberFormatSymbols_gu_IN", "goog.i18n.NumberFormatSymbols_he", "goog.i18n.NumberFormatSymbols_he_IL", "goog.i18n.NumberFormatSymbols_hi", "goog.i18n.NumberFormatSymbols_hi_IN", "goog.i18n.NumberFormatSymbols_hr", "goog.i18n.NumberFormatSymbols_hr_HR", "goog.i18n.NumberFormatSymbols_hu", "goog.i18n.NumberFormatSymbols_hu_HU", "goog.i18n.NumberFormatSymbols_id", "goog.i18n.NumberFormatSymbols_id_ID", "goog.i18n.NumberFormatSymbols_in", "goog.i18n.NumberFormatSymbols_is", "goog.i18n.NumberFormatSymbols_is_IS", "goog.i18n.NumberFormatSymbols_it", "goog.i18n.NumberFormatSymbols_it_IT", "goog.i18n.NumberFormatSymbols_iw", "goog.i18n.NumberFormatSymbols_ja", "goog.i18n.NumberFormatSymbols_ja_JP", "goog.i18n.NumberFormatSymbols_kn", "goog.i18n.NumberFormatSymbols_kn_IN", "goog.i18n.NumberFormatSymbols_ko", "goog.i18n.NumberFormatSymbols_ko_KR", "goog.i18n.NumberFormatSymbols_ln", "goog.i18n.NumberFormatSymbols_ln_CD", "goog.i18n.NumberFormatSymbols_lt", "goog.i18n.NumberFormatSymbols_lt_LT", "goog.i18n.NumberFormatSymbols_lv", "goog.i18n.NumberFormatSymbols_lv_LV", "goog.i18n.NumberFormatSymbols_ml", "goog.i18n.NumberFormatSymbols_ml_IN", "goog.i18n.NumberFormatSymbols_mr", "goog.i18n.NumberFormatSymbols_mr_IN", "goog.i18n.NumberFormatSymbols_ms", "goog.i18n.NumberFormatSymbols_ms_MY", "goog.i18n.NumberFormatSymbols_mt", "goog.i18n.NumberFormatSymbols_mt_MT", "goog.i18n.NumberFormatSymbols_nl", "goog.i18n.NumberFormatSymbols_nl_NL", "goog.i18n.NumberFormatSymbols_no", "goog.i18n.NumberFormatSymbols_or", "goog.i18n.NumberFormatSymbols_or_IN", "goog.i18n.NumberFormatSymbols_pl", "goog.i18n.NumberFormatSymbols_pl_PL", "goog.i18n.NumberFormatSymbols_pt", "goog.i18n.NumberFormatSymbols_pt_BR", "goog.i18n.NumberFormatSymbols_pt_PT", "goog.i18n.NumberFormatSymbols_ro", "goog.i18n.NumberFormatSymbols_ro_RO", "goog.i18n.NumberFormatSymbols_ru", "goog.i18n.NumberFormatSymbols_ru_RU", "goog.i18n.NumberFormatSymbols_sk", "goog.i18n.NumberFormatSymbols_sk_SK", "goog.i18n.NumberFormatSymbols_sl", "goog.i18n.NumberFormatSymbols_sl_SI", "goog.i18n.NumberFormatSymbols_sq", "goog.i18n.NumberFormatSymbols_sq_AL", "goog.i18n.NumberFormatSymbols_sr", "goog.i18n.NumberFormatSymbols_sr_Cyrl_RS", "goog.i18n.NumberFormatSymbols_sr_Latn_RS", "goog.i18n.NumberFormatSymbols_sv", "goog.i18n.NumberFormatSymbols_sv_SE", "goog.i18n.NumberFormatSymbols_sw", "goog.i18n.NumberFormatSymbols_sw_TZ", "goog.i18n.NumberFormatSymbols_ta", "goog.i18n.NumberFormatSymbols_ta_IN", "goog.i18n.NumberFormatSymbols_te", "goog.i18n.NumberFormatSymbols_te_IN", "goog.i18n.NumberFormatSymbols_th", "goog.i18n.NumberFormatSymbols_th_TH", "goog.i18n.NumberFormatSymbols_tl", "goog.i18n.NumberFormatSymbols_tr", "goog.i18n.NumberFormatSymbols_tr_TR", "goog.i18n.NumberFormatSymbols_uk", "goog.i18n.NumberFormatSymbols_uk_UA", "goog.i18n.NumberFormatSymbols_ur", "goog.i18n.NumberFormatSymbols_ur_PK", "goog.i18n.NumberFormatSymbols_vi", "goog.i18n.NumberFormatSymbols_vi_VN", "goog.i18n.NumberFormatSymbols_zh", "goog.i18n.NumberFormatSymbols_zh_CN", "goog.i18n.NumberFormatSymbols_zh_HK", "goog.i18n.NumberFormatSymbols_zh_Hans", "goog.i18n.NumberFormatSymbols_zh_Hans_CN", "goog.i18n.NumberFormatSymbols_zh_TW", "goog.i18n.NumberFormatSymbols_zu", "goog.i18n.NumberFormatSymbols_zu_ZA"], []);
goog.addDependency("/i18n/numberformatsymbolsext.js", ["goog.i18n.NumberFormatSymbolsExt", "goog.i18n.NumberFormatSymbols_aa", "goog.i18n.NumberFormatSymbols_aa_DJ", "goog.i18n.NumberFormatSymbols_aa_ER", "goog.i18n.NumberFormatSymbols_aa_ET", "goog.i18n.NumberFormatSymbols_af_NA", "goog.i18n.NumberFormatSymbols_agq", "goog.i18n.NumberFormatSymbols_agq_CM", "goog.i18n.NumberFormatSymbols_ak", "goog.i18n.NumberFormatSymbols_ak_GH", "goog.i18n.NumberFormatSymbols_ar_AE", "goog.i18n.NumberFormatSymbols_ar_BH", "goog.i18n.NumberFormatSymbols_ar_DZ", "goog.i18n.NumberFormatSymbols_ar_IQ", "goog.i18n.NumberFormatSymbols_ar_JO", "goog.i18n.NumberFormatSymbols_ar_KW", "goog.i18n.NumberFormatSymbols_ar_LB", "goog.i18n.NumberFormatSymbols_ar_LY", "goog.i18n.NumberFormatSymbols_ar_MA", "goog.i18n.NumberFormatSymbols_ar_OM", "goog.i18n.NumberFormatSymbols_ar_QA", "goog.i18n.NumberFormatSymbols_ar_SA", "goog.i18n.NumberFormatSymbols_ar_SD", "goog.i18n.NumberFormatSymbols_ar_SY", "goog.i18n.NumberFormatSymbols_ar_TN", "goog.i18n.NumberFormatSymbols_ar_YE", "goog.i18n.NumberFormatSymbols_as", "goog.i18n.NumberFormatSymbols_as_IN", "goog.i18n.NumberFormatSymbols_asa", "goog.i18n.NumberFormatSymbols_asa_TZ", "goog.i18n.NumberFormatSymbols_az", "goog.i18n.NumberFormatSymbols_az_Cyrl", "goog.i18n.NumberFormatSymbols_az_Cyrl_AZ", "goog.i18n.NumberFormatSymbols_az_Latn", "goog.i18n.NumberFormatSymbols_az_Latn_AZ", "goog.i18n.NumberFormatSymbols_bas", "goog.i18n.NumberFormatSymbols_bas_CM", "goog.i18n.NumberFormatSymbols_be", "goog.i18n.NumberFormatSymbols_be_BY", "goog.i18n.NumberFormatSymbols_bem", "goog.i18n.NumberFormatSymbols_bem_ZM", "goog.i18n.NumberFormatSymbols_bez", "goog.i18n.NumberFormatSymbols_bez_TZ", "goog.i18n.NumberFormatSymbols_bm", "goog.i18n.NumberFormatSymbols_bm_ML", "goog.i18n.NumberFormatSymbols_bn_IN", "goog.i18n.NumberFormatSymbols_bo", "goog.i18n.NumberFormatSymbols_bo_CN", "goog.i18n.NumberFormatSymbols_bo_IN", "goog.i18n.NumberFormatSymbols_br", "goog.i18n.NumberFormatSymbols_br_FR", "goog.i18n.NumberFormatSymbols_brx", "goog.i18n.NumberFormatSymbols_brx_IN", "goog.i18n.NumberFormatSymbols_bs", "goog.i18n.NumberFormatSymbols_bs_BA", "goog.i18n.NumberFormatSymbols_byn", "goog.i18n.NumberFormatSymbols_byn_ER", "goog.i18n.NumberFormatSymbols_cch", "goog.i18n.NumberFormatSymbols_cch_NG", "goog.i18n.NumberFormatSymbols_cgg", "goog.i18n.NumberFormatSymbols_cgg_UG", "goog.i18n.NumberFormatSymbols_chr", "goog.i18n.NumberFormatSymbols_chr_US", "goog.i18n.NumberFormatSymbols_ckb", "goog.i18n.NumberFormatSymbols_ckb_Arab", "goog.i18n.NumberFormatSymbols_ckb_Arab_IQ", "goog.i18n.NumberFormatSymbols_ckb_Arab_IR", "goog.i18n.NumberFormatSymbols_ckb_IQ", "goog.i18n.NumberFormatSymbols_ckb_IR", "goog.i18n.NumberFormatSymbols_ckb_Latn", "goog.i18n.NumberFormatSymbols_ckb_Latn_IQ", "goog.i18n.NumberFormatSymbols_cy", "goog.i18n.NumberFormatSymbols_cy_GB", "goog.i18n.NumberFormatSymbols_dav", "goog.i18n.NumberFormatSymbols_dav_KE", "goog.i18n.NumberFormatSymbols_de_LI", "goog.i18n.NumberFormatSymbols_dje", "goog.i18n.NumberFormatSymbols_dje_NE", "goog.i18n.NumberFormatSymbols_dua", "goog.i18n.NumberFormatSymbols_dua_CM", "goog.i18n.NumberFormatSymbols_dyo", "goog.i18n.NumberFormatSymbols_dyo_SN", "goog.i18n.NumberFormatSymbols_dz", "goog.i18n.NumberFormatSymbols_dz_BT", "goog.i18n.NumberFormatSymbols_ebu", "goog.i18n.NumberFormatSymbols_ebu_KE", "goog.i18n.NumberFormatSymbols_ee", "goog.i18n.NumberFormatSymbols_ee_GH", "goog.i18n.NumberFormatSymbols_ee_TG", "goog.i18n.NumberFormatSymbols_el_CY", "goog.i18n.NumberFormatSymbols_en_BB", "goog.i18n.NumberFormatSymbols_en_BE", "goog.i18n.NumberFormatSymbols_en_BM", "goog.i18n.NumberFormatSymbols_en_BW", "goog.i18n.NumberFormatSymbols_en_BZ", "goog.i18n.NumberFormatSymbols_en_CA", "goog.i18n.NumberFormatSymbols_en_GY", "goog.i18n.NumberFormatSymbols_en_HK", "goog.i18n.NumberFormatSymbols_en_JM", "goog.i18n.NumberFormatSymbols_en_MT", "goog.i18n.NumberFormatSymbols_en_MU", "goog.i18n.NumberFormatSymbols_en_NA", "goog.i18n.NumberFormatSymbols_en_NZ", "goog.i18n.NumberFormatSymbols_en_PH", "goog.i18n.NumberFormatSymbols_en_PK", "goog.i18n.NumberFormatSymbols_en_Shaw", "goog.i18n.NumberFormatSymbols_en_TT", "goog.i18n.NumberFormatSymbols_en_ZW", "goog.i18n.NumberFormatSymbols_eo", "goog.i18n.NumberFormatSymbols_es_AR", "goog.i18n.NumberFormatSymbols_es_BO", "goog.i18n.NumberFormatSymbols_es_CL", "goog.i18n.NumberFormatSymbols_es_CO", "goog.i18n.NumberFormatSymbols_es_CR", "goog.i18n.NumberFormatSymbols_es_DO", "goog.i18n.NumberFormatSymbols_es_EC", "goog.i18n.NumberFormatSymbols_es_GQ", "goog.i18n.NumberFormatSymbols_es_GT", "goog.i18n.NumberFormatSymbols_es_HN", "goog.i18n.NumberFormatSymbols_es_MX", "goog.i18n.NumberFormatSymbols_es_NI", "goog.i18n.NumberFormatSymbols_es_PA", "goog.i18n.NumberFormatSymbols_es_PE", "goog.i18n.NumberFormatSymbols_es_PR", "goog.i18n.NumberFormatSymbols_es_PY", "goog.i18n.NumberFormatSymbols_es_SV", "goog.i18n.NumberFormatSymbols_es_US", "goog.i18n.NumberFormatSymbols_es_UY", "goog.i18n.NumberFormatSymbols_es_VE", "goog.i18n.NumberFormatSymbols_ewo", "goog.i18n.NumberFormatSymbols_ewo_CM", "goog.i18n.NumberFormatSymbols_fa_AF", "goog.i18n.NumberFormatSymbols_ff", "goog.i18n.NumberFormatSymbols_ff_SN", "goog.i18n.NumberFormatSymbols_fo", "goog.i18n.NumberFormatSymbols_fo_FO", "goog.i18n.NumberFormatSymbols_fr_BE", "goog.i18n.NumberFormatSymbols_fr_BF", "goog.i18n.NumberFormatSymbols_fr_BI", "goog.i18n.NumberFormatSymbols_fr_BJ", "goog.i18n.NumberFormatSymbols_fr_CD", "goog.i18n.NumberFormatSymbols_fr_CF", "goog.i18n.NumberFormatSymbols_fr_CG", "goog.i18n.NumberFormatSymbols_fr_CH", "goog.i18n.NumberFormatSymbols_fr_CI", "goog.i18n.NumberFormatSymbols_fr_CM", "goog.i18n.NumberFormatSymbols_fr_DJ", "goog.i18n.NumberFormatSymbols_fr_GA", "goog.i18n.NumberFormatSymbols_fr_GN", "goog.i18n.NumberFormatSymbols_fr_GQ", "goog.i18n.NumberFormatSymbols_fr_KM", "goog.i18n.NumberFormatSymbols_fr_LU", "goog.i18n.NumberFormatSymbols_fr_MG", "goog.i18n.NumberFormatSymbols_fr_ML", "goog.i18n.NumberFormatSymbols_fr_NE", "goog.i18n.NumberFormatSymbols_fr_RW", "goog.i18n.NumberFormatSymbols_fr_SN", "goog.i18n.NumberFormatSymbols_fr_TD", "goog.i18n.NumberFormatSymbols_fr_TG", "goog.i18n.NumberFormatSymbols_fur", "goog.i18n.NumberFormatSymbols_fur_IT", "goog.i18n.NumberFormatSymbols_ga", "goog.i18n.NumberFormatSymbols_ga_IE", "goog.i18n.NumberFormatSymbols_gaa", "goog.i18n.NumberFormatSymbols_gaa_GH", "goog.i18n.NumberFormatSymbols_guz", "goog.i18n.NumberFormatSymbols_guz_KE", "goog.i18n.NumberFormatSymbols_gv", "goog.i18n.NumberFormatSymbols_gv_GB", "goog.i18n.NumberFormatSymbols_ha", "goog.i18n.NumberFormatSymbols_ha_Latn", "goog.i18n.NumberFormatSymbols_ha_Latn_GH", "goog.i18n.NumberFormatSymbols_ha_Latn_NE", "goog.i18n.NumberFormatSymbols_ha_Latn_NG", "goog.i18n.NumberFormatSymbols_haw", "goog.i18n.NumberFormatSymbols_haw_US", "goog.i18n.NumberFormatSymbols_hy", "goog.i18n.NumberFormatSymbols_hy_AM", "goog.i18n.NumberFormatSymbols_ia", "goog.i18n.NumberFormatSymbols_ig", "goog.i18n.NumberFormatSymbols_ig_NG", "goog.i18n.NumberFormatSymbols_ii", "goog.i18n.NumberFormatSymbols_ii_CN", "goog.i18n.NumberFormatSymbols_it_CH", "goog.i18n.NumberFormatSymbols_jmc", "goog.i18n.NumberFormatSymbols_jmc_TZ", "goog.i18n.NumberFormatSymbols_ka", "goog.i18n.NumberFormatSymbols_ka_GE", "goog.i18n.NumberFormatSymbols_kab", "goog.i18n.NumberFormatSymbols_kab_DZ", "goog.i18n.NumberFormatSymbols_kaj", "goog.i18n.NumberFormatSymbols_kaj_NG", "goog.i18n.NumberFormatSymbols_kam", "goog.i18n.NumberFormatSymbols_kam_KE", "goog.i18n.NumberFormatSymbols_kcg", "goog.i18n.NumberFormatSymbols_kcg_NG", "goog.i18n.NumberFormatSymbols_kde", "goog.i18n.NumberFormatSymbols_kde_TZ", "goog.i18n.NumberFormatSymbols_kea", "goog.i18n.NumberFormatSymbols_kea_CV", "goog.i18n.NumberFormatSymbols_khq", "goog.i18n.NumberFormatSymbols_khq_ML", "goog.i18n.NumberFormatSymbols_ki", "goog.i18n.NumberFormatSymbols_ki_KE", "goog.i18n.NumberFormatSymbols_kk", "goog.i18n.NumberFormatSymbols_kk_Cyrl", "goog.i18n.NumberFormatSymbols_kk_Cyrl_KZ", "goog.i18n.NumberFormatSymbols_kl", "goog.i18n.NumberFormatSymbols_kl_GL", "goog.i18n.NumberFormatSymbols_kln", "goog.i18n.NumberFormatSymbols_kln_KE", "goog.i18n.NumberFormatSymbols_km", "goog.i18n.NumberFormatSymbols_km_KH", "goog.i18n.NumberFormatSymbols_kok", "goog.i18n.NumberFormatSymbols_kok_IN", "goog.i18n.NumberFormatSymbols_ksb", "goog.i18n.NumberFormatSymbols_ksb_TZ", "goog.i18n.NumberFormatSymbols_ksf", "goog.i18n.NumberFormatSymbols_ksf_CM", "goog.i18n.NumberFormatSymbols_ksh", "goog.i18n.NumberFormatSymbols_ksh_DE", "goog.i18n.NumberFormatSymbols_ku", "goog.i18n.NumberFormatSymbols_ku_Arab", "goog.i18n.NumberFormatSymbols_ku_Arab_IQ", "goog.i18n.NumberFormatSymbols_ku_Arab_IR", "goog.i18n.NumberFormatSymbols_ku_Latn", "goog.i18n.NumberFormatSymbols_ku_Latn_SY", "goog.i18n.NumberFormatSymbols_ku_Latn_TR", "goog.i18n.NumberFormatSymbols_kw", "goog.i18n.NumberFormatSymbols_kw_GB", "goog.i18n.NumberFormatSymbols_ky", "goog.i18n.NumberFormatSymbols_ky_KG", "goog.i18n.NumberFormatSymbols_lag", "goog.i18n.NumberFormatSymbols_lag_TZ", "goog.i18n.NumberFormatSymbols_lg", "goog.i18n.NumberFormatSymbols_lg_UG", "goog.i18n.NumberFormatSymbols_ln_CG", "goog.i18n.NumberFormatSymbols_lo", "goog.i18n.NumberFormatSymbols_lo_LA", "goog.i18n.NumberFormatSymbols_lu", "goog.i18n.NumberFormatSymbols_lu_CD", "goog.i18n.NumberFormatSymbols_luo", "goog.i18n.NumberFormatSymbols_luo_KE", "goog.i18n.NumberFormatSymbols_luy", "goog.i18n.NumberFormatSymbols_luy_KE", "goog.i18n.NumberFormatSymbols_mas", "goog.i18n.NumberFormatSymbols_mas_KE", "goog.i18n.NumberFormatSymbols_mas_TZ", "goog.i18n.NumberFormatSymbols_mer", "goog.i18n.NumberFormatSymbols_mer_KE", "goog.i18n.NumberFormatSymbols_mfe", "goog.i18n.NumberFormatSymbols_mfe_MU", "goog.i18n.NumberFormatSymbols_mg", "goog.i18n.NumberFormatSymbols_mg_MG", "goog.i18n.NumberFormatSymbols_mgh", "goog.i18n.NumberFormatSymbols_mgh_MZ", "goog.i18n.NumberFormatSymbols_mk", "goog.i18n.NumberFormatSymbols_mk_MK", "goog.i18n.NumberFormatSymbols_mn", "goog.i18n.NumberFormatSymbols_mn_Cyrl", "goog.i18n.NumberFormatSymbols_mn_Cyrl_MN", "goog.i18n.NumberFormatSymbols_mn_Mong", "goog.i18n.NumberFormatSymbols_mn_Mong_CN", "goog.i18n.NumberFormatSymbols_ms_BN", "goog.i18n.NumberFormatSymbols_mua", "goog.i18n.NumberFormatSymbols_mua_CM", "goog.i18n.NumberFormatSymbols_my", "goog.i18n.NumberFormatSymbols_my_MM", "goog.i18n.NumberFormatSymbols_naq", "goog.i18n.NumberFormatSymbols_naq_NA", "goog.i18n.NumberFormatSymbols_nb", "goog.i18n.NumberFormatSymbols_nb_NO", "goog.i18n.NumberFormatSymbols_nd", "goog.i18n.NumberFormatSymbols_nd_ZW", "goog.i18n.NumberFormatSymbols_nds", "goog.i18n.NumberFormatSymbols_nds_DE", "goog.i18n.NumberFormatSymbols_ne", "goog.i18n.NumberFormatSymbols_ne_IN", "goog.i18n.NumberFormatSymbols_ne_NP", "goog.i18n.NumberFormatSymbols_nl_AW", "goog.i18n.NumberFormatSymbols_nl_BE", "goog.i18n.NumberFormatSymbols_nmg", "goog.i18n.NumberFormatSymbols_nmg_CM", "goog.i18n.NumberFormatSymbols_nn", "goog.i18n.NumberFormatSymbols_nn_NO", "goog.i18n.NumberFormatSymbols_nr", "goog.i18n.NumberFormatSymbols_nr_ZA", "goog.i18n.NumberFormatSymbols_nso", "goog.i18n.NumberFormatSymbols_nso_ZA", "goog.i18n.NumberFormatSymbols_nus", "goog.i18n.NumberFormatSymbols_nus_SD", "goog.i18n.NumberFormatSymbols_nyn", "goog.i18n.NumberFormatSymbols_nyn_UG", "goog.i18n.NumberFormatSymbols_oc", "goog.i18n.NumberFormatSymbols_oc_FR", "goog.i18n.NumberFormatSymbols_om", "goog.i18n.NumberFormatSymbols_om_ET", "goog.i18n.NumberFormatSymbols_om_KE", "goog.i18n.NumberFormatSymbols_pa", "goog.i18n.NumberFormatSymbols_pa_Arab", "goog.i18n.NumberFormatSymbols_pa_Arab_PK", "goog.i18n.NumberFormatSymbols_pa_Guru", "goog.i18n.NumberFormatSymbols_pa_Guru_IN", "goog.i18n.NumberFormatSymbols_ps", "goog.i18n.NumberFormatSymbols_ps_AF", "goog.i18n.NumberFormatSymbols_pt_AO", "goog.i18n.NumberFormatSymbols_pt_GW", "goog.i18n.NumberFormatSymbols_pt_MZ", "goog.i18n.NumberFormatSymbols_pt_ST", "goog.i18n.NumberFormatSymbols_rm", "goog.i18n.NumberFormatSymbols_rm_CH", "goog.i18n.NumberFormatSymbols_rn", "goog.i18n.NumberFormatSymbols_rn_BI", "goog.i18n.NumberFormatSymbols_ro_MD", "goog.i18n.NumberFormatSymbols_rof", "goog.i18n.NumberFormatSymbols_rof_TZ", "goog.i18n.NumberFormatSymbols_ru_MD", "goog.i18n.NumberFormatSymbols_ru_UA", "goog.i18n.NumberFormatSymbols_rw", "goog.i18n.NumberFormatSymbols_rw_RW", "goog.i18n.NumberFormatSymbols_rwk", "goog.i18n.NumberFormatSymbols_rwk_TZ", "goog.i18n.NumberFormatSymbols_sah", "goog.i18n.NumberFormatSymbols_sah_RU", "goog.i18n.NumberFormatSymbols_saq", "goog.i18n.NumberFormatSymbols_saq_KE", "goog.i18n.NumberFormatSymbols_sbp", "goog.i18n.NumberFormatSymbols_sbp_TZ", "goog.i18n.NumberFormatSymbols_se", "goog.i18n.NumberFormatSymbols_se_FI", "goog.i18n.NumberFormatSymbols_se_NO", "goog.i18n.NumberFormatSymbols_seh", "goog.i18n.NumberFormatSymbols_seh_MZ", "goog.i18n.NumberFormatSymbols_ses", "goog.i18n.NumberFormatSymbols_ses_ML", "goog.i18n.NumberFormatSymbols_sg", "goog.i18n.NumberFormatSymbols_sg_CF", "goog.i18n.NumberFormatSymbols_shi", "goog.i18n.NumberFormatSymbols_shi_Latn", "goog.i18n.NumberFormatSymbols_shi_Latn_MA", "goog.i18n.NumberFormatSymbols_shi_Tfng", "goog.i18n.NumberFormatSymbols_shi_Tfng_MA", "goog.i18n.NumberFormatSymbols_si", "goog.i18n.NumberFormatSymbols_si_LK", "goog.i18n.NumberFormatSymbols_sid", "goog.i18n.NumberFormatSymbols_sid_ET", "goog.i18n.NumberFormatSymbols_sn", "goog.i18n.NumberFormatSymbols_sn_ZW", "goog.i18n.NumberFormatSymbols_so", "goog.i18n.NumberFormatSymbols_so_DJ", "goog.i18n.NumberFormatSymbols_so_ET", "goog.i18n.NumberFormatSymbols_so_KE", "goog.i18n.NumberFormatSymbols_so_SO", "goog.i18n.NumberFormatSymbols_sr_Cyrl", "goog.i18n.NumberFormatSymbols_sr_Cyrl_BA", "goog.i18n.NumberFormatSymbols_sr_Cyrl_ME", "goog.i18n.NumberFormatSymbols_sr_Latn", "goog.i18n.NumberFormatSymbols_sr_Latn_BA", "goog.i18n.NumberFormatSymbols_sr_Latn_ME", "goog.i18n.NumberFormatSymbols_ss", "goog.i18n.NumberFormatSymbols_ss_SZ", "goog.i18n.NumberFormatSymbols_ss_ZA", "goog.i18n.NumberFormatSymbols_ssy", "goog.i18n.NumberFormatSymbols_ssy_ER", "goog.i18n.NumberFormatSymbols_st", "goog.i18n.NumberFormatSymbols_st_LS", "goog.i18n.NumberFormatSymbols_st_ZA", "goog.i18n.NumberFormatSymbols_sv_FI", "goog.i18n.NumberFormatSymbols_sw_KE", "goog.i18n.NumberFormatSymbols_swc", "goog.i18n.NumberFormatSymbols_swc_CD", "goog.i18n.NumberFormatSymbols_ta_LK", "goog.i18n.NumberFormatSymbols_teo", "goog.i18n.NumberFormatSymbols_teo_KE", "goog.i18n.NumberFormatSymbols_teo_UG", "goog.i18n.NumberFormatSymbols_tg", "goog.i18n.NumberFormatSymbols_tg_Cyrl", "goog.i18n.NumberFormatSymbols_tg_Cyrl_TJ", "goog.i18n.NumberFormatSymbols_ti", "goog.i18n.NumberFormatSymbols_ti_ER", "goog.i18n.NumberFormatSymbols_ti_ET", "goog.i18n.NumberFormatSymbols_tig", "goog.i18n.NumberFormatSymbols_tig_ER", "goog.i18n.NumberFormatSymbols_tn", "goog.i18n.NumberFormatSymbols_tn_ZA", "goog.i18n.NumberFormatSymbols_to", "goog.i18n.NumberFormatSymbols_to_TO", "goog.i18n.NumberFormatSymbols_trv", "goog.i18n.NumberFormatSymbols_trv_TW", "goog.i18n.NumberFormatSymbols_ts", "goog.i18n.NumberFormatSymbols_ts_ZA", "goog.i18n.NumberFormatSymbols_twq", "goog.i18n.NumberFormatSymbols_twq_NE", "goog.i18n.NumberFormatSymbols_tzm", "goog.i18n.NumberFormatSymbols_tzm_Latn", "goog.i18n.NumberFormatSymbols_tzm_Latn_MA", "goog.i18n.NumberFormatSymbols_ur_IN", "goog.i18n.NumberFormatSymbols_uz", "goog.i18n.NumberFormatSymbols_uz_Arab", "goog.i18n.NumberFormatSymbols_uz_Arab_AF", "goog.i18n.NumberFormatSymbols_uz_Cyrl", "goog.i18n.NumberFormatSymbols_uz_Cyrl_UZ", "goog.i18n.NumberFormatSymbols_uz_Latn", "goog.i18n.NumberFormatSymbols_uz_Latn_UZ", "goog.i18n.NumberFormatSymbols_vai", "goog.i18n.NumberFormatSymbols_vai_Latn", "goog.i18n.NumberFormatSymbols_vai_Latn_LR", "goog.i18n.NumberFormatSymbols_vai_Vaii", "goog.i18n.NumberFormatSymbols_vai_Vaii_LR", "goog.i18n.NumberFormatSymbols_ve", "goog.i18n.NumberFormatSymbols_ve_ZA", "goog.i18n.NumberFormatSymbols_vun", "goog.i18n.NumberFormatSymbols_vun_TZ", "goog.i18n.NumberFormatSymbols_wae", "goog.i18n.NumberFormatSymbols_wae_CH", "goog.i18n.NumberFormatSymbols_wal", "goog.i18n.NumberFormatSymbols_wal_ET", "goog.i18n.NumberFormatSymbols_xh", "goog.i18n.NumberFormatSymbols_xh_ZA", "goog.i18n.NumberFormatSymbols_xog", "goog.i18n.NumberFormatSymbols_xog_UG", "goog.i18n.NumberFormatSymbols_yav", "goog.i18n.NumberFormatSymbols_yav_CM", "goog.i18n.NumberFormatSymbols_yo", "goog.i18n.NumberFormatSymbols_yo_NG", "goog.i18n.NumberFormatSymbols_zh_Hans_HK", "goog.i18n.NumberFormatSymbols_zh_Hans_MO", "goog.i18n.NumberFormatSymbols_zh_Hans_SG", "goog.i18n.NumberFormatSymbols_zh_Hant", "goog.i18n.NumberFormatSymbols_zh_Hant_HK", "goog.i18n.NumberFormatSymbols_zh_Hant_MO", "goog.i18n.NumberFormatSymbols_zh_Hant_TW"], ["goog.i18n.NumberFormatSymbols"]);
goog.addDependency("/i18n/pluralrules.js", ["goog.i18n.pluralRules"], []);
goog.addDependency("/i18n/timezone.js", ["goog.i18n.TimeZone"], ["goog.array", "goog.date.DateLike", "goog.string"]);
goog.addDependency("/i18n/uchar.js", ["goog.i18n.uChar"], []);
goog.addDependency("/iter/iter.js", ["goog.iter", "goog.iter.Iterator", "goog.iter.StopIteration"], ["goog.array", "goog.asserts"]);
goog.addDependency("/jsaction/context.js", ["goog.jsaction.Context"], []);
goog.addDependency("/jsaction/dispatcher.js", ["goog.jsaction.Dispatcher", "goog.jsaction.HandlerFunction", "goog.jsaction.LoaderFunction"], ["goog.asserts", "goog.jsaction.Context", "goog.jsaction.EventContract", "goog.jsaction.replay", "goog.jsaction.util"]);
goog.addDependency("/jsaction/eventcontract.js", ["goog.jsaction.EventContract", "goog.jsaction.EventType", "goog.jsaction.ReplayInfo"], ["goog.jsaction.util", "goog.object"]);
goog.addDependency("/jsaction/jsprops.js", ["goog.jsaction.jsprops"], ["goog.json"]);
goog.addDependency("/jsaction/replay.js", ["goog.jsaction.replay"], ["goog.asserts", "goog.jsaction.EventContract"]);
goog.addDependency("/jsaction/util.js", ["goog.jsaction.util"], []);
goog.addDependency("/json/json.js", ["goog.json", "goog.json.Serializer"], []);
goog.addDependency("/labs/async/result/result.js", ["goog.labs.async.Result"], []);
goog.addDependency("/labs/async/result/resultbase.js", ["goog.labs.async.ResultBase", "goog.labs.async.ResultBase.StateError"], ["goog.debug.Error", "goog.labs.async.Result"]);
goog.addDependency("/labs/net/xhr.js", ["goog.labs.net.xhr", "goog.labs.net.xhr.Error", "goog.labs.net.xhr.HttpError", "goog.labs.net.xhr.TimeoutError"], ["goog.async.Deferred", "goog.debug.Error", "goog.json", "goog.net.HttpStatus", "goog.net.XmlHttp", "goog.string", "goog.uri.utils"]);
goog.addDependency("/labs/observe/notice.js", ["goog.labs.observe.Notice"], []);
goog.addDependency("/labs/observe/noticetype.js", ["goog.labs.observe.NoticeType"], []);
goog.addDependency("/labs/observe/observable.js", ["goog.labs.observe.Observable"], ["goog.disposable.IDisposable"]);
goog.addDependency("/labs/observe/observe.js", ["goog.labs.observe"], ["goog.labs.observe.Observer"]);
goog.addDependency("/labs/observe/observer.js", ["goog.labs.observe.Observer"], []);
goog.addDependency("/labs/observe/simpleobservable.js", ["goog.labs.observe.SimpleObservable"], ["goog.Disposable", "goog.array", "goog.asserts", "goog.labs.observe.Notice", "goog.labs.observe.NoticeType", "goog.labs.observe.Observable", "goog.object"]);
goog.addDependency("/loader.js", ["prezentacja.Loader"], ["goog.net.XhrIo", "goog.events"]);
goog.addDependency("/locale/countries.js", ["goog.locale.countries"], []);
goog.addDependency("/locale/defaultlocalenameconstants.js", ["goog.locale.defaultLocaleNameConstants"], []);
goog.addDependency("/locale/genericfontnames.js", ["goog.locale.genericFontNames"], []);
goog.addDependency("/locale/genericfontnamesdata.js", ["goog.locale.genericFontNamesData"], ["goog.locale"]);
goog.addDependency("/locale/locale.js", ["goog.locale"], ["goog.locale.nativeNameConstants"]);
goog.addDependency("/locale/nativenameconstants.js", ["goog.locale.nativeNameConstants"], []);
goog.addDependency("/locale/scriptToLanguages.js", ["goog.locale.scriptToLanguages"], ["goog.locale"]);
goog.addDependency("/locale/timezonedetection.js", ["goog.locale.timeZoneDetection"], ["goog.locale", "goog.locale.TimeZoneFingerprint"]);
goog.addDependency("/locale/timezonefingerprint.js", ["goog.locale.TimeZoneFingerprint"], ["goog.locale"]);
goog.addDependency("/locale/timezonelist.js", ["goog.locale.TimeZoneList"], ["goog.locale"]);
goog.addDependency("/math/bezier.js", ["goog.math.Bezier"], ["goog.math", "goog.math.Coordinate"]);
goog.addDependency("/math/box.js", ["goog.math.Box"], ["goog.math.Coordinate"]);
goog.addDependency("/math/coordinate.js", ["goog.math.Coordinate"], []);
goog.addDependency("/math/coordinate3.js", ["goog.math.Coordinate3"], []);
goog.addDependency("/math/exponentialbackoff.js", ["goog.math.ExponentialBackoff"], ["goog.asserts"]);
goog.addDependency("/math/integer.js", ["goog.math.Integer"], []);
goog.addDependency("/math/line.js", ["goog.math.Line"], ["goog.math", "goog.math.Coordinate"]);
goog.addDependency("/math/long.js", ["goog.math.Long"], []);
goog.addDependency("/math/math.js", ["goog.math"], ["goog.array"]);
goog.addDependency("/math/matrix.js", ["goog.math.Matrix"], ["goog.array", "goog.math", "goog.math.Size"]);
goog.addDependency("/math/range.js", ["goog.math.Range"], []);
goog.addDependency("/math/rangeset.js", ["goog.math.RangeSet"], ["goog.array", "goog.iter.Iterator", "goog.iter.StopIteration", "goog.math.Range"]);
goog.addDependency("/math/rect.js", ["goog.math.Rect"], ["goog.math.Box", "goog.math.Size"]);
goog.addDependency("/math/size.js", ["goog.math.Size"], []);
goog.addDependency("/math/vec2.js", ["goog.math.Vec2"], ["goog.math", "goog.math.Coordinate"]);
goog.addDependency("/math/vec3.js", ["goog.math.Vec3"], ["goog.math", "goog.math.Coordinate3"]);
goog.addDependency("/memoize/memoize.js", ["goog.memoize"], []);
goog.addDependency("/messaging/abstractchannel.js", ["goog.messaging.AbstractChannel"], ["goog.Disposable", "goog.debug", "goog.debug.Logger", "goog.json", "goog.messaging.MessageChannel"]);
goog.addDependency("/messaging/bufferedchannel.js", ["goog.messaging.BufferedChannel"], ["goog.Timer", "goog.Uri", "goog.debug.Error", "goog.debug.Logger", "goog.events", "goog.messaging.MessageChannel", "goog.messaging.MultiChannel"]);
goog.addDependency("/messaging/deferredchannel.js", ["goog.messaging.DeferredChannel"], ["goog.Disposable", "goog.async.Deferred", "goog.messaging.MessageChannel"]);
goog.addDependency("/messaging/loggerclient.js", ["goog.messaging.LoggerClient"], ["goog.Disposable", "goog.debug", "goog.debug.LogManager", "goog.debug.Logger"]);
goog.addDependency("/messaging/loggerserver.js", ["goog.messaging.LoggerServer"], ["goog.Disposable", "goog.debug.Logger"]);
goog.addDependency("/messaging/messagechannel.js", ["goog.messaging.MessageChannel"], []);
goog.addDependency("/messaging/messaging.js", ["goog.messaging"], ["goog.messaging.MessageChannel"]);
goog.addDependency("/messaging/multichannel.js", ["goog.messaging.MultiChannel", "goog.messaging.MultiChannel.VirtualChannel"], ["goog.Disposable", "goog.debug.Logger", "goog.events.EventHandler", "goog.messaging.MessageChannel", "goog.object"]);
goog.addDependency("/messaging/portcaller.js", ["goog.messaging.PortCaller"], ["goog.Disposable", "goog.async.Deferred", "goog.messaging.DeferredChannel", "goog.messaging.PortChannel", "goog.messaging.PortNetwork", "goog.object"]);
goog.addDependency("/messaging/portchannel.js", ["goog.messaging.PortChannel"], ["goog.Timer", "goog.array", "goog.async.Deferred", "goog.debug", "goog.debug.Logger", "goog.dom", "goog.dom.DomHelper", "goog.events", "goog.events.EventType", "goog.json", "goog.messaging.AbstractChannel", "goog.messaging.DeferredChannel", "goog.object", "goog.string"]);
goog.addDependency("/messaging/portnetwork.js", ["goog.messaging.PortNetwork"], []);
goog.addDependency("/messaging/portoperator.js", ["goog.messaging.PortOperator"], ["goog.Disposable", "goog.asserts", "goog.debug.Logger", "goog.messaging.PortChannel", "goog.messaging.PortNetwork", "goog.object"]);
goog.addDependency("/messaging/respondingchannel.js", ["goog.messaging.RespondingChannel"], ["goog.Disposable", "goog.debug.Logger", "goog.messaging.MessageChannel", "goog.messaging.MultiChannel", "goog.messaging.MultiChannel.VirtualChannel"]);
goog.addDependency("/messaging/testdata/portchannel_worker.js", ["goog.messaging.testdata.portchannel_worker"], ["goog.messaging.PortChannel"]);
goog.addDependency("/messaging/testdata/portnetwork_worker1.js", ["goog.messaging.testdata.portnetwork_worker1"], ["goog.messaging.PortCaller", "goog.messaging.PortChannel"]);
goog.addDependency("/messaging/testdata/portnetwork_worker2.js", ["goog.messaging.testdata.portnetwork_worker2"], ["goog.messaging.PortCaller", "goog.messaging.PortChannel"]);
goog.addDependency("/module/abstractmoduleloader.js", ["goog.module.AbstractModuleLoader"], []);
goog.addDependency("/module/basemodule.js", ["goog.module.BaseModule"], ["goog.Disposable"]);
goog.addDependency("/module/loader.js", ["goog.module.Loader"], ["goog.Timer", "goog.array", "goog.dom", "goog.object"]);
goog.addDependency("/module/module.js", ["goog.module"], ["goog.array", "goog.module.Loader"]);
goog.addDependency("/module/moduleinfo.js", ["goog.module.ModuleInfo"], ["goog.Disposable", "goog.functions", "goog.module.BaseModule", "goog.module.ModuleLoadCallback"]);
goog.addDependency("/module/moduleloadcallback.js", ["goog.module.ModuleLoadCallback"], ["goog.debug.entryPointRegistry", "goog.debug.errorHandlerWeakDep"]);
goog.addDependency("/module/moduleloader.js", ["goog.module.ModuleLoader"], ["goog.Disposable", "goog.array", "goog.debug.Logger", "goog.dom", "goog.events.EventHandler", "goog.module.AbstractModuleLoader", "goog.net.BulkLoader", "goog.net.EventType", "goog.net.jsloader"]);
goog.addDependency("/module/modulemanager.js", ["goog.module.ModuleManager", "goog.module.ModuleManager.CallbackType", "goog.module.ModuleManager.FailureType"], ["goog.Disposable", "goog.array", "goog.asserts", "goog.async.Deferred", "goog.debug.Logger", "goog.debug.Trace", "goog.module.AbstractModuleLoader", "goog.module.ModuleInfo", "goog.module.ModuleLoadCallback"]);
goog.addDependency("/module/testdata/modA_1.js", ["goog.module.testdata.modA_1"], []);
goog.addDependency("/module/testdata/modA_2.js", ["goog.module.testdata.modA_2"], ["goog.module.ModuleManager"]);
goog.addDependency("/module/testdata/modB_1.js", ["goog.module.testdata.modB_1"], ["goog.module.ModuleManager"]);
goog.addDependency("/net/browserchannel.js", ["goog.net.BrowserChannel", "goog.net.BrowserChannel.Error", "goog.net.BrowserChannel.Event", "goog.net.BrowserChannel.Handler", "goog.net.BrowserChannel.LogSaver", "goog.net.BrowserChannel.QueuedMap", "goog.net.BrowserChannel.Stat", "goog.net.BrowserChannel.StatEvent", "goog.net.BrowserChannel.State", "goog.net.BrowserChannel.TimingEvent"], ["goog.Uri", "goog.array", "goog.debug.Logger", "goog.debug.TextFormatter", "goog.events.Event", "goog.events.EventTarget", "goog.json", "goog.net.BrowserTestChannel", "goog.net.ChannelDebug", "goog.net.ChannelRequest", "goog.net.ChannelRequest.Error", "goog.net.XhrIo", "goog.net.tmpnetwork", "goog.string", "goog.structs", "goog.structs.CircularBuffer", "goog.userAgent"]);
goog.addDependency("/net/browsertestchannel.js", ["goog.net.BrowserTestChannel"], ["goog.json", "goog.net.ChannelRequest", "goog.net.ChannelRequest.Error", "goog.net.tmpnetwork", "goog.userAgent"]);
goog.addDependency("/net/bulkloader.js", ["goog.net.BulkLoader"], ["goog.debug.Logger", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.net.BulkLoaderHelper", "goog.net.EventType", "goog.net.XhrIo"]);
goog.addDependency("/net/bulkloaderhelper.js", ["goog.net.BulkLoaderHelper"], ["goog.Disposable", "goog.debug.Logger"]);
goog.addDependency("/net/channeldebug.js", ["goog.net.ChannelDebug"], ["goog.debug.Logger", "goog.json"]);
goog.addDependency("/net/channelrequest.js", ["goog.net.ChannelRequest", "goog.net.ChannelRequest.Error"], ["goog.Timer", "goog.events", "goog.events.EventHandler", "goog.events.OnlineHandler.EventType", "goog.net.EventType", "goog.net.XmlHttp.ReadyState", "goog.object", "goog.userAgent"]);
goog.addDependency("/net/cookies.js", ["goog.net.Cookies", "goog.net.cookies"], ["goog.userAgent"]);
goog.addDependency("/net/crossdomainrpc.js", ["goog.net.CrossDomainRpc"], ["goog.Uri.QueryData", "goog.debug.Logger", "goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.json", "goog.net.EventType", "goog.net.HttpStatus", "goog.userAgent"]);
goog.addDependency("/net/errorcode.js", ["goog.net.ErrorCode"], []);
goog.addDependency("/net/eventtype.js", ["goog.net.EventType"], []);
goog.addDependency("/net/filedownloader.js", ["goog.net.FileDownloader", "goog.net.FileDownloader.Error"], ["goog.Disposable", "goog.asserts", "goog.async.Deferred", "goog.crypt.hash32", "goog.debug.Error", "goog.events.EventHandler", "goog.fs", "goog.fs.DirectoryEntry.Behavior", "goog.fs.Error.ErrorCode", "goog.fs.FileSaver.EventType", "goog.net.EventType", "goog.net.XhrIo.ResponseType", "goog.net.XhrIoPool"]);
goog.addDependency("/net/httpstatus.js", ["goog.net.HttpStatus"], []);
goog.addDependency("/net/iframeio.js", ["goog.net.IframeIo", "goog.net.IframeIo.IncrementalDataEvent"], ["goog.Timer", "goog.Uri", "goog.debug", "goog.debug.Logger", "goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.json", "goog.net.ErrorCode", "goog.net.EventType", "goog.reflect", "goog.string", "goog.structs", "goog.userAgent"]);
goog.addDependency("/net/iframeloadmonitor.js", ["goog.net.IframeLoadMonitor"], ["goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.userAgent"]);
goog.addDependency("/net/imageloader.js", ["goog.net.ImageLoader"], ["goog.dom", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.net.EventType", "goog.object", "goog.userAgent"]);
goog.addDependency("/net/ipaddress.js", ["goog.net.IpAddress", "goog.net.Ipv4Address", "goog.net.Ipv6Address"], ["goog.array", "goog.math.Integer", "goog.object", "goog.string"]);
goog.addDependency("/net/jsloader.js", ["goog.net.jsloader", "goog.net.jsloader.Error"], ["goog.array", "goog.async.Deferred", "goog.debug.Error", "goog.dom", "goog.userAgent"]);
goog.addDependency("/net/jsonp.js", ["goog.net.Jsonp"], ["goog.Uri", "goog.dom", "goog.net.jsloader"]);
goog.addDependency("/net/mockiframeio.js", ["goog.net.MockIFrameIo"], ["goog.events.EventTarget", "goog.net.ErrorCode", "goog.net.IframeIo", "goog.net.IframeIo.IncrementalDataEvent"]);
goog.addDependency("/net/mockxhrlite.js", ["goog.net.MockXhrLite"], ["goog.testing.net.XhrIo"]);
goog.addDependency("/net/multiiframeloadmonitor.js", ["goog.net.MultiIframeLoadMonitor"], ["goog.net.IframeLoadMonitor"]);
goog.addDependency("/net/networktester.js", ["goog.net.NetworkTester"], ["goog.Timer", "goog.Uri", "goog.debug.Logger"]);
goog.addDependency("/net/testdata/jsloader_test1.js", ["goog.net.testdata.jsloader_test1"], []);
goog.addDependency("/net/testdata/jsloader_test2.js", ["goog.net.testdata.jsloader_test2"], []);
goog.addDependency("/net/testdata/jsloader_test3.js", ["goog.net.testdata.jsloader_test3"], []);
goog.addDependency("/net/testdata/jsloader_test4.js", ["goog.net.testdata.jsloader_test4"], []);
goog.addDependency("/net/tmpnetwork.js", ["goog.net.tmpnetwork"], ["goog.Uri", "goog.net.ChannelDebug"]);
goog.addDependency("/net/websocket.js", ["goog.net.WebSocket", "goog.net.WebSocket.ErrorEvent", "goog.net.WebSocket.EventType", "goog.net.WebSocket.MessageEvent"], ["goog.Timer", "goog.asserts", "goog.debug.Logger", "goog.debug.entryPointRegistry", "goog.events", "goog.events.Event", "goog.events.EventTarget"]);
goog.addDependency("/net/wrapperxmlhttpfactory.js", ["goog.net.WrapperXmlHttpFactory"], ["goog.net.XmlHttpFactory"]);
goog.addDependency("/net/xhrio.js", ["goog.net.XhrIo", "goog.net.XhrIo.ResponseType"], ["goog.Timer", "goog.debug.Logger", "goog.debug.entryPointRegistry", "goog.debug.errorHandlerWeakDep", "goog.events.EventTarget", "goog.json", "goog.net.ErrorCode", "goog.net.EventType", "goog.net.HttpStatus", "goog.net.XmlHttp", "goog.object", "goog.structs", "goog.structs.Map", "goog.uri.utils"]);
goog.addDependency("/net/xhriopool.js", ["goog.net.XhrIoPool"], ["goog.net.XhrIo", "goog.structs", "goog.structs.PriorityPool"]);
goog.addDependency("/net/xhrlite.js", ["goog.net.XhrLite"], ["goog.net.XhrIo"]);
goog.addDependency("/net/xhrlitepool.js", ["goog.net.XhrLitePool"], ["goog.net.XhrIoPool"]);
goog.addDependency("/net/xhrmanager.js", ["goog.net.XhrManager", "goog.net.XhrManager.Event", "goog.net.XhrManager.Request"], ["goog.Disposable", "goog.events", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.net.EventType", "goog.net.XhrIo", "goog.net.XhrIoPool", "goog.structs.Map"]);
goog.addDependency("/net/xmlhttp.js", ["goog.net.DefaultXmlHttpFactory", "goog.net.XmlHttp", "goog.net.XmlHttp.OptionType", "goog.net.XmlHttp.ReadyState"], ["goog.net.WrapperXmlHttpFactory", "goog.net.XmlHttpFactory"]);
goog.addDependency("/net/xmlhttpfactory.js", ["goog.net.XmlHttpFactory"], []);
goog.addDependency("/net/xpc/crosspagechannel.js", ["goog.net.xpc.CrossPageChannel"], ["goog.Disposable", "goog.Uri", "goog.dom", "goog.events", "goog.json", "goog.messaging.AbstractChannel", "goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.FrameElementMethodTransport", "goog.net.xpc.IframePollingTransport", "goog.net.xpc.IframeRelayTransport", "goog.net.xpc.NativeMessagingTransport", "goog.net.xpc.NixTransport", "goog.net.xpc.Transport", "goog.userAgent"]);
goog.addDependency("/net/xpc/crosspagechannelrole.js", ["goog.net.xpc.CrossPageChannelRole"], []);
goog.addDependency("/net/xpc/frameelementmethodtransport.js", ["goog.net.xpc.FrameElementMethodTransport"], ["goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.Transport"]);
goog.addDependency("/net/xpc/iframepollingtransport.js", ["goog.net.xpc.IframePollingTransport", "goog.net.xpc.IframePollingTransport.Receiver", "goog.net.xpc.IframePollingTransport.Sender"], ["goog.array", "goog.dom", "goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.Transport", "goog.userAgent"]);
goog.addDependency("/net/xpc/iframerelaytransport.js", ["goog.net.xpc.IframeRelayTransport"], ["goog.dom", "goog.events", "goog.net.xpc", "goog.net.xpc.Transport", "goog.userAgent"]);
goog.addDependency("/net/xpc/nativemessagingtransport.js", ["goog.net.xpc.NativeMessagingTransport"], ["goog.events", "goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.Transport"]);
goog.addDependency("/net/xpc/nixtransport.js", ["goog.net.xpc.NixTransport"], ["goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.Transport", "goog.reflect"]);
goog.addDependency("/net/xpc/relay.js", ["goog.net.xpc.relay"], []);
goog.addDependency("/net/xpc/transport.js", ["goog.net.xpc.Transport"], ["goog.Disposable", "goog.dom", "goog.net.xpc"]);
goog.addDependency("/net/xpc/xpc.js", ["goog.net.xpc", "goog.net.xpc.CfgFields", "goog.net.xpc.ChannelStates", "goog.net.xpc.TransportNames", "goog.net.xpc.TransportTypes", "goog.net.xpc.UriCfgFields"], ["goog.debug.Logger"]);
goog.addDependency("/object/object.js", ["goog.object"], []);
goog.addDependency("/positioning/absoluteposition.js", ["goog.positioning.AbsolutePosition"], ["goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.positioning", "goog.positioning.AbstractPosition"]);
goog.addDependency("/positioning/abstractposition.js", ["goog.positioning.AbstractPosition"], ["goog.math.Box", "goog.math.Size", "goog.positioning.Corner"]);
goog.addDependency("/positioning/anchoredposition.js", ["goog.positioning.AnchoredPosition"], ["goog.math.Box", "goog.positioning", "goog.positioning.AbstractPosition"]);
goog.addDependency("/positioning/anchoredviewportposition.js", ["goog.positioning.AnchoredViewportPosition"], ["goog.functions", "goog.math.Box", "goog.positioning", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.positioning.Overflow", "goog.positioning.OverflowStatus"]);
goog.addDependency("/positioning/clientposition.js", ["goog.positioning.ClientPosition"], ["goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.positioning", "goog.positioning.AbstractPosition"]);
goog.addDependency("/positioning/menuanchoredposition.js", ["goog.positioning.MenuAnchoredPosition"], ["goog.math.Box", "goog.math.Size", "goog.positioning", "goog.positioning.AnchoredViewportPosition", "goog.positioning.Corner", "goog.positioning.Overflow"]);
goog.addDependency("/positioning/positioning.js", ["goog.positioning", "goog.positioning.Corner", "goog.positioning.CornerBit", "goog.positioning.Overflow", "goog.positioning.OverflowStatus"], ["goog.dom", "goog.dom.TagName", "goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.style", "goog.style.bidi"]);
goog.addDependency("/positioning/viewportclientposition.js", ["goog.positioning.ViewportClientPosition"], ["goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.positioning.ClientPosition"]);
goog.addDependency("/positioning/viewportposition.js", ["goog.positioning.ViewportPosition"], ["goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.positioning.AbstractPosition"]);
goog.addDependency("/proto/proto.js", ["goog.proto"], ["goog.proto.Serializer"]);
goog.addDependency("/proto/serializer.js", ["goog.proto.Serializer"], ["goog.json.Serializer", "goog.string"]);
goog.addDependency("/proto2/descriptor.js", ["goog.proto2.Descriptor", "goog.proto2.Metadata"], ["goog.array", "goog.object", "goog.proto2.Util"]);
goog.addDependency("/proto2/fielddescriptor.js", ["goog.proto2.FieldDescriptor"], ["goog.proto2.Util", "goog.string"]);
goog.addDependency("/proto2/lazydeserializer.js", ["goog.proto2.LazyDeserializer"], ["goog.proto2.Serializer", "goog.proto2.Util"]);
goog.addDependency("/proto2/message.js", ["goog.proto2.Message"], ["goog.proto2.Descriptor", "goog.proto2.FieldDescriptor", "goog.proto2.Util", "goog.string"]);
goog.addDependency("/proto2/objectserializer.js", ["goog.proto2.ObjectSerializer"], ["goog.proto2.Serializer", "goog.proto2.Util", "goog.string"]);
goog.addDependency("/proto2/package_test.pb.js", ["someprotopackage.TestPackageTypes"], ["goog.proto2.Message", "proto2.TestAllTypes"]);
goog.addDependency("/proto2/pbliteserializer.js", ["goog.proto2.PbLiteSerializer"], ["goog.proto2.LazyDeserializer", "goog.proto2.Util"]);
goog.addDependency("/proto2/serializer.js", ["goog.proto2.Serializer"], ["goog.proto2.Descriptor", "goog.proto2.FieldDescriptor", "goog.proto2.Message", "goog.proto2.Util"]);
goog.addDependency("/proto2/test.pb.js", ["proto2.TestAllTypes", "proto2.TestAllTypes.NestedMessage", "proto2.TestAllTypes.OptionalGroup", "proto2.TestAllTypes.RepeatedGroup", "proto2.TestAllTypes.NestedEnum"], ["goog.proto2.Message"]);
goog.addDependency("/proto2/textformatserializer.js", ["goog.proto2.TextFormatSerializer", "goog.proto2.TextFormatSerializer.Parser"], ["goog.json", "goog.proto2.Serializer", "goog.proto2.Util", "goog.string"]);
goog.addDependency("/proto2/util.js", ["goog.proto2.Util"], ["goog.asserts"]);
goog.addDependency("/pubsub/pubsub.js", ["goog.pubsub.PubSub"], ["goog.Disposable", "goog.array"]);
goog.addDependency("/reflect/reflect.js", ["goog.reflect"], []);
goog.addDependency("/soy/renderer.js", ["goog.soy.InjectedDataSupplier", "goog.soy.Renderer"], ["goog.dom", "goog.soy"]);
goog.addDependency("/soy/soy.js", ["goog.soy"], ["goog.dom", "goog.dom.NodeType", "goog.dom.TagName"]);
goog.addDependency("/soy/soy_test.js", ["goog.soy.testHelper"], ["goog.dom", "goog.string", "goog.userAgent"]);
goog.addDependency("/spell/spellcheck.js", ["goog.spell.SpellCheck", "goog.spell.SpellCheck.WordChangedEvent"], ["goog.Timer", "goog.events.EventTarget", "goog.structs.Set"]);
goog.addDependency("/stats/basicstat.js", ["goog.stats.BasicStat"], ["goog.array", "goog.debug.Logger", "goog.iter", "goog.object", "goog.string.format", "goog.structs.CircularBuffer"]);
goog.addDependency("/storage/collectablestorage.js", ["goog.storage.CollectableStorage"], ["goog.array", "goog.asserts", "goog.iter", "goog.storage.ErrorCode", "goog.storage.ExpiringStorage", "goog.storage.RichStorage.Wrapper", "goog.storage.mechanism.IterableMechanism"]);
goog.addDependency("/storage/encryptedstorage.js", ["goog.storage.EncryptedStorage"], ["goog.crypt", "goog.crypt.Arc4", "goog.crypt.Sha1", "goog.crypt.base64", "goog.json", "goog.json.Serializer", "goog.storage.CollectableStorage", "goog.storage.ErrorCode", "goog.storage.RichStorage", "goog.storage.RichStorage.Wrapper", "goog.storage.mechanism.IterableMechanism"]);
goog.addDependency("/storage/errorcode.js", ["goog.storage.ErrorCode"], []);
goog.addDependency("/storage/expiringstorage.js", ["goog.storage.ExpiringStorage"], ["goog.storage.RichStorage", "goog.storage.RichStorage.Wrapper", "goog.storage.mechanism.Mechanism"]);
goog.addDependency("/storage/mechanism/errorcode.js", ["goog.storage.mechanism.ErrorCode"], []);
goog.addDependency("/storage/mechanism/html5localstorage.js", ["goog.storage.mechanism.HTML5LocalStorage"], ["goog.storage.mechanism.HTML5WebStorage"]);
goog.addDependency("/storage/mechanism/html5sessionstorage.js", ["goog.storage.mechanism.HTML5SessionStorage"], ["goog.storage.mechanism.HTML5WebStorage"]);
goog.addDependency("/storage/mechanism/html5webstorage.js", ["goog.storage.mechanism.HTML5WebStorage"], ["goog.asserts", "goog.iter.Iterator", "goog.iter.StopIteration", "goog.storage.mechanism.ErrorCode", "goog.storage.mechanism.IterableMechanism"]);
goog.addDependency("/storage/mechanism/ieuserdata.js", ["goog.storage.mechanism.IEUserData"], ["goog.asserts", "goog.iter.Iterator", "goog.iter.StopIteration", "goog.storage.mechanism.ErrorCode", "goog.storage.mechanism.IterableMechanism", "goog.structs.Map", "goog.userAgent"]);
goog.addDependency("/storage/mechanism/iterablemechanism.js", ["goog.storage.mechanism.IterableMechanism"], ["goog.array", "goog.asserts", "goog.iter", "goog.iter.Iterator", "goog.storage.mechanism.Mechanism"]);
goog.addDependency("/storage/mechanism/iterablemechanism_test.js", ["goog.storage.mechanism.iterablemechanism_test"], ["goog.iter.Iterator", "goog.storage.mechanism.IterableMechanism", "goog.testing.asserts"]);
goog.addDependency("/storage/mechanism/mechanism.js", ["goog.storage.mechanism.Mechanism"], []);
goog.addDependency("/storage/mechanism/mechanism_test.js", ["goog.storage.mechanism.mechanism_test"], ["goog.storage.mechanism.ErrorCode", "goog.storage.mechanism.HTML5LocalStorage", "goog.storage.mechanism.Mechanism", "goog.testing.asserts", "goog.userAgent.product", "goog.userAgent.product.isVersion"]);
goog.addDependency("/storage/mechanism/mechanismfactory.js", ["goog.storage.mechanism.mechanismfactory"], ["goog.storage.mechanism.HTML5LocalStorage", "goog.storage.mechanism.HTML5SessionStorage", "goog.storage.mechanism.IEUserData", "goog.storage.mechanism.IterableMechanism", "goog.storage.mechanism.PrefixedMechanism"]);
goog.addDependency("/storage/mechanism/prefixedmechanism.js", ["goog.storage.mechanism.PrefixedMechanism"], ["goog.iter.Iterator", "goog.storage.mechanism.IterableMechanism"]);
goog.addDependency("/storage/mechanism/prefixedmechanism_test.js", ["goog.storage.mechanism.prefixedmechanism_test"], ["goog.iter.Iterator", "goog.storage.mechanism.IterableMechanism", "goog.testing.asserts"]);
goog.addDependency("/storage/richstorage.js", ["goog.storage.RichStorage", "goog.storage.RichStorage.Wrapper"], ["goog.storage.ErrorCode", "goog.storage.Storage", "goog.storage.mechanism.Mechanism"]);
goog.addDependency("/storage/storage.js", ["goog.storage.Storage"], ["goog.json", "goog.json.Serializer", "goog.storage.ErrorCode", "goog.storage.mechanism.Mechanism"]);
goog.addDependency("/storage/storage_test.js", ["goog.storage.storage_test"], ["goog.storage.Storage", "goog.structs.Map", "goog.testing.asserts"]);
goog.addDependency("/string/linkify.js", ["goog.string.linkify"], ["goog.string"]);
goog.addDependency("/string/path.js", ["goog.string.path"], ["goog.array", "goog.string"]);
goog.addDependency("/string/string.js", ["goog.string", "goog.string.Unicode"], []);
goog.addDependency("/string/stringbuffer.js", ["goog.string.StringBuffer"], ["goog.userAgent.jscript"]);
goog.addDependency("/string/stringformat.js", ["goog.string.format"], ["goog.string"]);
goog.addDependency("/structs/avltree.js", ["goog.structs.AvlTree", "goog.structs.AvlTree.Node"], ["goog.structs", "goog.structs.Collection"]);
goog.addDependency("/structs/circularbuffer.js", ["goog.structs.CircularBuffer"], []);
goog.addDependency("/structs/collection.js", ["goog.structs.Collection"], []);
goog.addDependency("/structs/heap.js", ["goog.structs.Heap"], ["goog.array", "goog.object", "goog.structs.Node"]);
goog.addDependency("/structs/inversionmap.js", ["goog.structs.InversionMap"], ["goog.array"]);
goog.addDependency("/structs/linkedmap.js", ["goog.structs.LinkedMap"], ["goog.structs.Map"]);
goog.addDependency("/structs/map.js", ["goog.structs.Map"], ["goog.iter.Iterator", "goog.iter.StopIteration", "goog.object", "goog.structs"]);
goog.addDependency("/structs/node.js", ["goog.structs.Node"], []);
goog.addDependency("/structs/pool.js", ["goog.structs.Pool"], ["goog.Disposable", "goog.structs.Queue", "goog.structs.Set"]);
goog.addDependency("/structs/prioritypool.js", ["goog.structs.PriorityPool"], ["goog.structs.Pool", "goog.structs.PriorityQueue"]);
goog.addDependency("/structs/priorityqueue.js", ["goog.structs.PriorityQueue"], ["goog.structs", "goog.structs.Heap"]);
goog.addDependency("/structs/quadtree.js", ["goog.structs.QuadTree", "goog.structs.QuadTree.Node", "goog.structs.QuadTree.Point"], ["goog.math.Coordinate"]);
goog.addDependency("/structs/queue.js", ["goog.structs.Queue"], ["goog.array"]);
goog.addDependency("/structs/set.js", ["goog.structs.Set"], ["goog.structs", "goog.structs.Collection", "goog.structs.Map"]);
goog.addDependency("/structs/simplepool.js", ["goog.structs.SimplePool"], ["goog.Disposable"]);
goog.addDependency("/structs/stringset.js", ["goog.structs.StringSet"], ["goog.iter"]);
goog.addDependency("/structs/structs.js", ["goog.structs"], ["goog.array", "goog.object"]);
goog.addDependency("/structs/treenode.js", ["goog.structs.TreeNode"], ["goog.array", "goog.asserts", "goog.structs.Node"]);
goog.addDependency("/structs/trie.js", ["goog.structs.Trie"], ["goog.object", "goog.structs"]);
goog.addDependency("/style/bidi.js", ["goog.style.bidi"], ["goog.style", "goog.userAgent"]);
goog.addDependency("/style/cursor.js", ["goog.style.cursor"], ["goog.userAgent"]);
goog.addDependency("/style/style.js", ["goog.style"], ["goog.array", "goog.dom", "goog.math.Box", "goog.math.Coordinate", "goog.math.Rect", "goog.math.Size", "goog.object", "goog.string", "goog.userAgent"]);
goog.addDependency("/style/style_test.js", ["goog.style_test"], ["goog.dom", "goog.style", "goog.testing.asserts"]);
goog.addDependency("/style/transition.js", ["goog.style.transition", "goog.style.transition.Css3Property"], ["goog.array", "goog.asserts"]);
goog.addDependency("/testing/asserts.js", ["goog.testing.JsUnitException", "goog.testing.asserts"], ["goog.testing.stacktrace"]);
goog.addDependency("/testing/async/mockcontrol.js", ["goog.testing.async.MockControl"], ["goog.asserts", "goog.async.Deferred", "goog.debug", "goog.testing.asserts", "goog.testing.mockmatchers.IgnoreArgument"]);
goog.addDependency("/testing/asynctestcase.js", ["goog.testing.AsyncTestCase", "goog.testing.AsyncTestCase.ControlBreakingException"], ["goog.testing.TestCase", "goog.testing.TestCase.Test", "goog.testing.asserts"]);
goog.addDependency("/testing/benchmark.js", ["goog.testing.benchmark"], ["goog.dom", "goog.dom.TagName", "goog.testing.PerformanceTable", "goog.testing.PerformanceTimer", "goog.testing.TestCase"]);
goog.addDependency("/testing/benchmarks/jsbinarysizebutton.js", ["goog.ui.benchmarks.jsbinarysizebutton"], ["goog.array", "goog.dom", "goog.events", "goog.ui.Button", "goog.ui.ButtonSide", "goog.ui.Component.EventType", "goog.ui.CustomButton"]);
goog.addDependency("/testing/benchmarks/jsbinarysizetoolbar.js", ["goog.ui.benchmarks.jsbinarysizetoolbar"], ["goog.array", "goog.dom", "goog.events", "goog.object", "goog.ui.Component.EventType", "goog.ui.Option", "goog.ui.Toolbar", "goog.ui.ToolbarButton", "goog.ui.ToolbarSelect", "goog.ui.ToolbarSeparator"]);
goog.addDependency("/testing/continuationtestcase.js", ["goog.testing.ContinuationTestCase", "goog.testing.ContinuationTestCase.Step", "goog.testing.ContinuationTestCase.Test"], ["goog.array", "goog.events.EventHandler", "goog.testing.TestCase", "goog.testing.TestCase.Test", "goog.testing.asserts"]);
goog.addDependency("/testing/deferredtestcase.js", ["goog.testing.DeferredTestCase"], ["goog.async.Deferred", "goog.testing.AsyncTestCase", "goog.testing.TestCase"]);
goog.addDependency("/testing/dom.js", ["goog.testing.dom"], ["goog.dom", "goog.dom.NodeIterator", "goog.dom.NodeType", "goog.dom.TagIterator", "goog.dom.TagName", "goog.dom.classes", "goog.iter", "goog.object", "goog.string", "goog.style", "goog.testing.asserts", "goog.userAgent"]);
goog.addDependency("/testing/editor/dom.js", ["goog.testing.editor.dom"], ["goog.dom.NodeType", "goog.dom.TagIterator", "goog.dom.TagWalkType", "goog.iter", "goog.string", "goog.testing.asserts"]);
goog.addDependency("/testing/editor/fieldmock.js", ["goog.testing.editor.FieldMock"], ["goog.dom", "goog.dom.Range", "goog.editor.Field", "goog.testing.LooseMock"]);
goog.addDependency("/testing/editor/testhelper.js", ["goog.testing.editor.TestHelper"], ["goog.Disposable", "goog.dom", "goog.dom.Range", "goog.editor.BrowserFeature", "goog.editor.node", "goog.testing.dom"]);
goog.addDependency("/testing/events/eventobserver.js", ["goog.testing.events.EventObserver"], ["goog.array"]);
goog.addDependency("/testing/events/events.js", ["goog.testing.events", "goog.testing.events.Event"], ["goog.events", "goog.events.BrowserEvent", "goog.events.BrowserEvent.MouseButton", "goog.events.BrowserFeature", "goog.events.Event", "goog.events.EventType", "goog.events.KeyCodes", "goog.object", "goog.style", "goog.userAgent"]);
goog.addDependency("/testing/events/matchers.js", ["goog.testing.events.EventMatcher"], ["goog.events.Event", "goog.testing.mockmatchers.ArgumentMatcher"]);
goog.addDependency("/testing/events/onlinehandler.js", ["goog.testing.events.OnlineHandler"], ["goog.events.EventTarget", "goog.events.OnlineHandler.EventType"]);
goog.addDependency("/testing/expectedfailures.js", ["goog.testing.ExpectedFailures"], ["goog.debug.DivConsole", "goog.debug.Logger", "goog.dom", "goog.dom.TagName", "goog.events", "goog.events.EventType", "goog.style", "goog.testing.JsUnitException", "goog.testing.TestCase", "goog.testing.asserts"]);
goog.addDependency("/testing/fs/blob.js", ["goog.testing.fs.Blob"], ["goog.crypt.base64"]);
goog.addDependency("/testing/fs/entry.js", ["goog.testing.fs.DirectoryEntry", "goog.testing.fs.Entry", "goog.testing.fs.FileEntry"], ["goog.Timer", "goog.array", "goog.async.Deferred", "goog.fs.DirectoryEntry", "goog.fs.DirectoryEntry.Behavior", "goog.fs.Error", "goog.functions", "goog.object", "goog.string", "goog.testing.fs.File", "goog.testing.fs.FileWriter"]);
goog.addDependency("/testing/fs/file.js", ["goog.testing.fs.File"], ["goog.testing.fs.Blob"]);
goog.addDependency("/testing/fs/filereader.js", ["goog.testing.fs.FileReader"], ["goog.Timer", "goog.events.EventTarget", "goog.fs.Error", "goog.fs.FileReader.EventType", "goog.fs.FileReader.ReadyState", "goog.testing.fs.File", "goog.testing.fs.ProgressEvent"]);
goog.addDependency("/testing/fs/filesystem.js", ["goog.testing.fs.FileSystem"], ["goog.testing.fs.DirectoryEntry"]);
goog.addDependency("/testing/fs/filewriter.js", ["goog.testing.fs.FileWriter"], ["goog.Timer", "goog.events.Event", "goog.events.EventTarget", "goog.fs.Error", "goog.fs.FileSaver.EventType", "goog.fs.FileSaver.ReadyState", "goog.string", "goog.testing.fs.File", "goog.testing.fs.ProgressEvent"]);
goog.addDependency("/testing/fs/fs.js", ["goog.testing.fs"], ["goog.Timer", "goog.array", "goog.fs", "goog.testing.fs.Blob", "goog.testing.fs.FileSystem"]);
goog.addDependency("/testing/fs/progressevent.js", ["goog.testing.fs.ProgressEvent"], ["goog.events.Event"]);
goog.addDependency("/testing/functionmock.js", ["goog.testing", "goog.testing.FunctionMock", "goog.testing.GlobalFunctionMock", "goog.testing.MethodMock"], ["goog.object", "goog.testing.LooseMock", "goog.testing.Mock", "goog.testing.MockInterface", "goog.testing.PropertyReplacer", "goog.testing.StrictMock"]);
goog.addDependency("/testing/graphics.js", ["goog.testing.graphics"], ["goog.graphics.Path.Segment", "goog.testing.asserts"]);
goog.addDependency("/testing/jsunit.js", ["goog.testing.jsunit"], ["goog.testing.TestCase", "goog.testing.TestRunner"]);
goog.addDependency("/testing/loosemock.js", ["goog.testing.LooseExpectationCollection", "goog.testing.LooseMock"], ["goog.array", "goog.structs.Map", "goog.testing.Mock"]);
goog.addDependency("/testing/messaging/mockmessagechannel.js", ["goog.testing.messaging.MockMessageChannel"], ["goog.messaging.AbstractChannel", "goog.testing.asserts"]);
goog.addDependency("/testing/messaging/mockmessageevent.js", ["goog.testing.messaging.MockMessageEvent"], ["goog.events.BrowserEvent", "goog.events.EventType", "goog.testing.events"]);
goog.addDependency("/testing/messaging/mockmessageport.js", ["goog.testing.messaging.MockMessagePort"], ["goog.events.EventTarget"]);
goog.addDependency("/testing/messaging/mockportnetwork.js", ["goog.testing.messaging.MockPortNetwork"], ["goog.messaging.PortNetwork", "goog.testing.messaging.MockMessageChannel"]);
goog.addDependency("/testing/mock.js", ["goog.testing.Mock", "goog.testing.MockExpectation"], ["goog.array", "goog.testing.JsUnitException", "goog.testing.MockInterface", "goog.testing.mockmatchers"]);
goog.addDependency("/testing/mockclassfactory.js", ["goog.testing.MockClassFactory", "goog.testing.MockClassRecord"], ["goog.array", "goog.object", "goog.testing.LooseMock", "goog.testing.StrictMock", "goog.testing.TestCase", "goog.testing.mockmatchers"]);
goog.addDependency("/testing/mockclock.js", ["goog.testing.MockClock"], ["goog.Disposable", "goog.testing.PropertyReplacer"]);
goog.addDependency("/testing/mockcontrol.js", ["goog.testing.MockControl"], ["goog.array", "goog.testing", "goog.testing.LooseMock", "goog.testing.MockInterface", "goog.testing.StrictMock"]);
goog.addDependency("/testing/mockinterface.js", ["goog.testing.MockInterface"], []);
goog.addDependency("/testing/mockmatchers.js", ["goog.testing.mockmatchers", "goog.testing.mockmatchers.ArgumentMatcher", "goog.testing.mockmatchers.IgnoreArgument", "goog.testing.mockmatchers.InstanceOf", "goog.testing.mockmatchers.ObjectEquals", "goog.testing.mockmatchers.RegexpMatch", "goog.testing.mockmatchers.SaveArgument", "goog.testing.mockmatchers.TypeOf"], ["goog.array", "goog.dom", "goog.testing.asserts"]);
goog.addDependency("/testing/mockrandom.js", ["goog.testing.MockRandom"], ["goog.Disposable"]);
goog.addDependency("/testing/mockrange.js", ["goog.testing.MockRange"], ["goog.dom.AbstractRange", "goog.testing.LooseMock"]);
goog.addDependency("/testing/mockstorage.js", ["goog.testing.MockStorage"], ["goog.structs.Map"]);
goog.addDependency("/testing/mockuseragent.js", ["goog.testing.MockUserAgent"], ["goog.Disposable", "goog.userAgent"]);
goog.addDependency("/testing/multitestrunner.js", ["goog.testing.MultiTestRunner", "goog.testing.MultiTestRunner.TestFrame"], ["goog.Timer", "goog.array", "goog.dom", "goog.dom.classes", "goog.events.EventHandler", "goog.functions", "goog.string", "goog.ui.Component", "goog.ui.ServerChart", "goog.ui.ServerChart.ChartType", "goog.ui.TableSorter"]);
goog.addDependency("/testing/net/xhrio.js", ["goog.testing.net.XhrIo"], ["goog.array", "goog.dom.xml", "goog.events", "goog.events.EventTarget", "goog.json", "goog.net.ErrorCode", "goog.net.EventType", "goog.net.HttpStatus", "goog.net.XhrIo.ResponseType", "goog.net.XmlHttp", "goog.object", "goog.structs.Map", "goog.uri.utils"]);
goog.addDependency("/testing/net/xhriopool.js", ["goog.testing.net.XhrIoPool"], ["goog.net.XhrIoPool", "goog.testing.net.XhrIo"]);
goog.addDependency("/testing/objectpropertystring.js", ["goog.testing.ObjectPropertyString"], []);
goog.addDependency("/testing/performancetable.js", ["goog.testing.PerformanceTable"], ["goog.dom", "goog.testing.PerformanceTimer"]);
goog.addDependency("/testing/performancetimer.js", ["goog.testing.PerformanceTimer"], ["goog.array", "goog.math"]);
goog.addDependency("/testing/propertyreplacer.js", ["goog.testing.PropertyReplacer"], ["goog.userAgent"]);
goog.addDependency("/testing/pseudorandom.js", ["goog.testing.PseudoRandom"], ["goog.Disposable"]);
goog.addDependency("/testing/recordfunction.js", ["goog.testing.FunctionCall", "goog.testing.recordConstructor", "goog.testing.recordFunction"], []);
goog.addDependency("/testing/shardingtestcase.js", ["goog.testing.ShardingTestCase"], ["goog.asserts", "goog.testing.TestCase"]);
goog.addDependency("/testing/singleton.js", ["goog.testing.singleton"], []);
goog.addDependency("/testing/stacktrace.js", ["goog.testing.stacktrace", "goog.testing.stacktrace.Frame"], []);
goog.addDependency("/testing/storage/fakemechanism.js", ["goog.testing.storage.FakeMechanism"], ["goog.storage.mechanism.IterableMechanism", "goog.structs.Map"]);
goog.addDependency("/testing/strictmock.js", ["goog.testing.StrictMock"], ["goog.array", "goog.testing.Mock"]);
goog.addDependency("/testing/style/layoutasserts.js", ["goog.testing.style.layoutasserts"], ["goog.style", "goog.testing.asserts", "goog.testing.style"]);
goog.addDependency("/testing/style/style.js", ["goog.testing.style"], ["goog.math.Rect", "goog.style"]);
goog.addDependency("/testing/testcase.js", ["goog.testing.TestCase", "goog.testing.TestCase.Error", "goog.testing.TestCase.Order", "goog.testing.TestCase.Result", "goog.testing.TestCase.Test"], ["goog.testing.asserts", "goog.testing.stacktrace"]);
goog.addDependency("/testing/testqueue.js", ["goog.testing.TestQueue"], []);
goog.addDependency("/testing/testrunner.js", ["goog.testing.TestRunner"], ["goog.testing.TestCase"]);
goog.addDependency("/testing/ui/rendererasserts.js", ["goog.testing.ui.rendererasserts"], ["goog.testing.asserts"]);
goog.addDependency("/testing/ui/rendererharness.js", ["goog.testing.ui.RendererHarness"], ["goog.Disposable", "goog.dom.NodeType", "goog.testing.asserts"]);
goog.addDependency("/testing/ui/style.js", ["goog.testing.ui.style"], ["goog.array", "goog.dom", "goog.dom.classes", "goog.testing.asserts"]);
goog.addDependency("/timer/timer.js", ["goog.Timer"], ["goog.events.EventTarget"]);
goog.addDependency("/tweak/entries.js", ["goog.tweak.BaseEntry", "goog.tweak.BasePrimitiveSetting", "goog.tweak.BaseSetting", "goog.tweak.BooleanGroup", "goog.tweak.BooleanInGroupSetting", "goog.tweak.BooleanSetting", "goog.tweak.ButtonAction", "goog.tweak.NumericSetting", "goog.tweak.StringSetting"], ["goog.array", "goog.asserts", "goog.debug.Logger", "goog.object"]);
goog.addDependency("/tweak/registry.js", ["goog.tweak.Registry"], ["goog.asserts", "goog.debug.Logger", "goog.object", "goog.string", "goog.tweak.BaseEntry", "goog.uri.utils"]);
goog.addDependency("/tweak/testhelpers.js", ["goog.tweak.testhelpers"], ["goog.tweak"]);
goog.addDependency("/tweak/tweak.js", ["goog.tweak", "goog.tweak.ConfigParams"], ["goog.asserts", "goog.tweak.BooleanGroup", "goog.tweak.BooleanInGroupSetting", "goog.tweak.BooleanSetting", "goog.tweak.ButtonAction", "goog.tweak.NumericSetting", "goog.tweak.Registry", "goog.tweak.StringSetting"]);
goog.addDependency("/tweak/tweakui.js", ["goog.tweak.EntriesPanel", "goog.tweak.TweakUi"], ["goog.array", "goog.asserts", "goog.dom.DomHelper", "goog.object", "goog.style", "goog.tweak", "goog.ui.Zippy", "goog.userAgent"]);
goog.addDependency("/ui/abstractspellchecker.js", ["goog.ui.AbstractSpellChecker", "goog.ui.AbstractSpellChecker.AsyncResult"], ["goog.asserts", "goog.dom", "goog.dom.classes", "goog.dom.selection", "goog.events.EventType", "goog.math.Coordinate", "goog.spell.SpellCheck", "goog.structs.Set", "goog.style", "goog.ui.MenuItem", "goog.ui.MenuSeparator", "goog.ui.PopupMenu"]);
goog.addDependency("/ui/activitymonitor.js", ["goog.ui.ActivityMonitor"], ["goog.array", "goog.dom", "goog.events", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType"]);
goog.addDependency("/ui/advancedtooltip.js", ["goog.ui.AdvancedTooltip"], ["goog.events.EventType", "goog.math.Coordinate", "goog.ui.Tooltip", "goog.userAgent"]);
goog.addDependency("/ui/animatedzippy.js", ["goog.ui.AnimatedZippy"], ["goog.dom", "goog.events", "goog.fx.Animation", "goog.fx.Animation.EventType", "goog.fx.Transition.EventType", "goog.fx.easing", "goog.ui.Zippy", "goog.ui.ZippyEvent"]);
goog.addDependency("/ui/attachablemenu.js", ["goog.ui.AttachableMenu"], ["goog.dom.a11y", "goog.dom.a11y.State", "goog.events.KeyCodes", "goog.ui.ItemEvent", "goog.ui.MenuBase"]);
goog.addDependency("/ui/autocomplete/arraymatcher.js", ["goog.ui.AutoComplete.ArrayMatcher"], ["goog.iter", "goog.string", "goog.ui.AutoComplete"]);
goog.addDependency("/ui/autocomplete/autocomplete.js", ["goog.ui.AutoComplete", "goog.ui.AutoComplete.EventType"], ["goog.events", "goog.events.EventTarget"]);
goog.addDependency("/ui/autocomplete/basic.js", ["goog.ui.AutoComplete.Basic"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.ArrayMatcher", "goog.ui.AutoComplete.InputHandler", "goog.ui.AutoComplete.Renderer"]);
goog.addDependency("/ui/autocomplete/inputhandler.js", ["goog.ui.AutoComplete.InputHandler"], ["goog.Disposable", "goog.Timer", "goog.dom", "goog.dom.a11y", "goog.dom.selection", "goog.events.EventHandler", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.string", "goog.ui.AutoComplete", "goog.userAgent", "goog.userAgent.product"]);
goog.addDependency("/ui/autocomplete/remote.js", ["goog.ui.AutoComplete.Remote"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.InputHandler", "goog.ui.AutoComplete.RemoteArrayMatcher", "goog.ui.AutoComplete.Renderer"]);
goog.addDependency("/ui/autocomplete/remotearraymatcher.js", ["goog.ui.AutoComplete.RemoteArrayMatcher"], ["goog.Disposable", "goog.Uri", "goog.events", "goog.json", "goog.net.XhrIo", "goog.ui.AutoComplete"]);
goog.addDependency("/ui/autocomplete/renderer.js", ["goog.ui.AutoComplete.Renderer", "goog.ui.AutoComplete.Renderer.CustomRenderer"], ["goog.dispose", "goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType", "goog.fx.dom.FadeInAndShow", "goog.fx.dom.FadeOutAndHide", "goog.iter", "goog.string", "goog.style", "goog.ui.AutoComplete", "goog.ui.AutoComplete.EventType", "goog.ui.IdGenerator", "goog.userAgent"]);
goog.addDependency("/ui/autocomplete/richinputhandler.js", ["goog.ui.AutoComplete.RichInputHandler"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.InputHandler"]);
goog.addDependency("/ui/autocomplete/richremote.js", ["goog.ui.AutoComplete.RichRemote"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.Remote", "goog.ui.AutoComplete.Renderer", "goog.ui.AutoComplete.RichInputHandler", "goog.ui.AutoComplete.RichRemoteArrayMatcher"]);
goog.addDependency("/ui/autocomplete/richremotearraymatcher.js", ["goog.ui.AutoComplete.RichRemoteArrayMatcher"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.RemoteArrayMatcher"]);
goog.addDependency("/ui/basicmenu.js", ["goog.ui.BasicMenu", "goog.ui.BasicMenu.Item", "goog.ui.BasicMenu.Separator"], ["goog.array", "goog.dom", "goog.dom.a11y", "goog.events.EventType", "goog.positioning", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.ui.AttachableMenu", "goog.ui.ItemEvent"]);
goog.addDependency("/ui/bidiinput.js", ["goog.ui.BidiInput"], ["goog.events", "goog.events.InputHandler", "goog.i18n.bidi", "goog.ui.Component"]);
goog.addDependency("/ui/bubble.js", ["goog.ui.Bubble"], ["goog.Timer", "goog.dom", "goog.events", "goog.events.Event", "goog.events.EventType", "goog.math.Box", "goog.positioning", "goog.positioning.AbsolutePosition", "goog.positioning.AbstractPosition", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.style", "goog.ui.Component", "goog.ui.Popup", "goog.ui.Popup.AnchoredPosition"]);
goog.addDependency("/ui/button.js", ["goog.ui.Button", "goog.ui.Button.Side"], ["goog.events.KeyCodes", "goog.ui.ButtonRenderer", "goog.ui.ButtonSide", "goog.ui.Control", "goog.ui.ControlContent", "goog.ui.NativeButtonRenderer"]);
goog.addDependency("/ui/buttonrenderer.js", ["goog.ui.ButtonRenderer"], ["goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.ui.ButtonSide", "goog.ui.Component.State", "goog.ui.ControlRenderer"]);
goog.addDependency("/ui/buttonside.js", ["goog.ui.ButtonSide"], []);
goog.addDependency("/ui/cccbutton.js", ["goog.ui.CccButton"], ["goog.dom", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventType", "goog.ui.DeprecatedButton", "goog.userAgent"]);
goog.addDependency("/ui/charcounter.js", ["goog.ui.CharCounter", "goog.ui.CharCounter.Display"], ["goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.InputHandler"]);
goog.addDependency("/ui/charpicker.js", ["goog.ui.CharPicker"], ["goog.array", "goog.dom", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.events.InputHandler", "goog.events.KeyHandler", "goog.i18n.CharListDecompressor", "goog.i18n.uChar", "goog.structs.Set", "goog.style", "goog.ui.Button", "goog.ui.Component", "goog.ui.ContainerScroller", "goog.ui.FlatButtonRenderer", "goog.ui.HoverCard", "goog.ui.LabelInput", "goog.ui.Menu", "goog.ui.MenuButton", "goog.ui.MenuItem", "goog.ui.Tooltip.ElementTooltipPosition"]);
goog.addDependency("/ui/checkbox.js", ["goog.ui.Checkbox", "goog.ui.Checkbox.State"], ["goog.dom.a11y", "goog.dom.a11y.State", "goog.events.EventType", "goog.events.KeyCodes", "goog.ui.CheckboxRenderer", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.Control", "goog.ui.registry"]);
goog.addDependency("/ui/checkboxmenuitem.js", ["goog.ui.CheckBoxMenuItem"], ["goog.ui.ControlContent", "goog.ui.MenuItem", "goog.ui.registry"]);
goog.addDependency("/ui/checkboxrenderer.js", ["goog.ui.CheckboxRenderer"], ["goog.array", "goog.asserts", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.dom.classes", "goog.object", "goog.ui.ControlRenderer"]);
goog.addDependency("/ui/colorbutton.js", ["goog.ui.ColorButton"], ["goog.ui.Button", "goog.ui.ColorButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/colorbuttonrenderer.js", ["goog.ui.ColorButtonRenderer"], ["goog.dom.classes", "goog.functions", "goog.ui.ColorMenuButtonRenderer"]);
goog.addDependency("/ui/colormenubutton.js", ["goog.ui.ColorMenuButton"], ["goog.array", "goog.object", "goog.ui.ColorMenuButtonRenderer", "goog.ui.ColorPalette", "goog.ui.Component.EventType", "goog.ui.ControlContent", "goog.ui.Menu", "goog.ui.MenuButton", "goog.ui.registry"]);
goog.addDependency("/ui/colormenubuttonrenderer.js", ["goog.ui.ColorMenuButtonRenderer"], ["goog.color", "goog.dom.classes", "goog.ui.ControlContent", "goog.ui.MenuButtonRenderer", "goog.userAgent"]);
goog.addDependency("/ui/colorpalette.js", ["goog.ui.ColorPalette"], ["goog.array", "goog.color", "goog.dom", "goog.style", "goog.ui.Palette", "goog.ui.PaletteRenderer"]);
goog.addDependency("/ui/colorpicker.js", ["goog.ui.ColorPicker", "goog.ui.ColorPicker.EventType"], ["goog.ui.ColorPalette", "goog.ui.Component", "goog.ui.Component.State"]);
goog.addDependency("/ui/colorsplitbehavior.js", ["goog.ui.ColorSplitBehavior"], ["goog.ui.ColorButton", "goog.ui.ColorMenuButton", "goog.ui.SplitBehavior"]);
goog.addDependency("/ui/combobox.js", ["goog.ui.ComboBox", "goog.ui.ComboBoxItem"], ["goog.Timer", "goog.debug.Logger", "goog.dom.classes", "goog.events", "goog.events.InputHandler", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.string", "goog.style", "goog.ui.Component", "goog.ui.ItemEvent", "goog.ui.LabelInput", "goog.ui.Menu", "goog.ui.MenuItem", "goog.ui.registry", "goog.userAgent"]);
goog.addDependency("/ui/component.js", ["goog.ui.Component", "goog.ui.Component.Error", "goog.ui.Component.EventType", "goog.ui.Component.State"], ["goog.array", "goog.array.ArrayLike", "goog.dom", "goog.events.EventHandler", "goog.events.EventTarget", "goog.object", "goog.style", "goog.ui.IdGenerator"]);
goog.addDependency("/ui/container.js", ["goog.ui.Container", "goog.ui.Container.EventType", "goog.ui.Container.Orientation"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.style", "goog.ui.Component", "goog.ui.Component.Error", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.ContainerRenderer"]);
goog.addDependency("/ui/containerrenderer.js", ["goog.ui.ContainerRenderer"], ["goog.array", "goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.string", "goog.style", "goog.ui.Separator", "goog.ui.registry", "goog.userAgent"]);
goog.addDependency("/ui/containerscroller.js", ["goog.ui.ContainerScroller"], ["goog.Timer", "goog.events.EventHandler", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.Container.EventType"]);
goog.addDependency("/ui/control.js", ["goog.ui.Control"], ["goog.array", "goog.dom", "goog.events.BrowserEvent.MouseButton", "goog.events.Event", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.string", "goog.ui.Component", "goog.ui.Component.Error", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.ControlRenderer", "goog.ui.decorate", "goog.ui.registry", "goog.userAgent"]);
goog.addDependency("/ui/controlcontent.js", ["goog.ui.ControlContent"], []);
goog.addDependency("/ui/controlrenderer.js", ["goog.ui.ControlRenderer"], ["goog.array", "goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.dom.classes", "goog.object", "goog.style", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.userAgent"]);
goog.addDependency("/ui/cookieeditor.js", ["goog.ui.CookieEditor"], ["goog.dom", "goog.dom.TagName", "goog.events.EventType", "goog.net.cookies", "goog.string", "goog.style", "goog.ui.Component"]);
goog.addDependency("/ui/css3buttonrenderer.js", ["goog.ui.Css3ButtonRenderer"], ["goog.dom", "goog.dom.TagName", "goog.dom.classes", "goog.ui.Button", "goog.ui.ButtonRenderer", "goog.ui.ControlContent", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.registry"]);
goog.addDependency("/ui/css3menubuttonrenderer.js", ["goog.ui.Css3MenuButtonRenderer"], ["goog.dom", "goog.dom.TagName", "goog.ui.ControlContent", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.MenuButton", "goog.ui.MenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/cssnames.js", ["goog.ui.INLINE_BLOCK_CLASSNAME"], []);
goog.addDependency("/ui/custombutton.js", ["goog.ui.CustomButton"], ["goog.ui.Button", "goog.ui.ControlContent", "goog.ui.CustomButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/custombuttonrenderer.js", ["goog.ui.CustomButtonRenderer"], ["goog.dom", "goog.dom.classes", "goog.string", "goog.ui.ButtonRenderer", "goog.ui.ControlContent", "goog.ui.INLINE_BLOCK_CLASSNAME"]);
goog.addDependency("/ui/customcolorpalette.js", ["goog.ui.CustomColorPalette"], ["goog.color", "goog.dom", "goog.ui.ColorPalette"]);
goog.addDependency("/ui/datepicker.js", ["goog.ui.DatePicker", "goog.ui.DatePicker.Events", "goog.ui.DatePickerEvent"], ["goog.date", "goog.date.Date", "goog.date.Interval", "goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventType", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.i18n.DateTimeFormat", "goog.i18n.DateTimeSymbols", "goog.style", "goog.ui.Component", "goog.ui.IdGenerator"]);
goog.addDependency("/ui/decorate.js", ["goog.ui.decorate"], ["goog.ui.registry"]);
goog.addDependency("/ui/deprecatedbutton.js", ["goog.ui.DeprecatedButton"], ["goog.dom", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType"]);
goog.addDependency("/ui/dialog.js", ["goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.Dialog.ButtonSet.DefaultButtons", "goog.ui.Dialog.DefaultButtonCaptions", "goog.ui.Dialog.DefaultButtonKeys", "goog.ui.Dialog.Event", "goog.ui.Dialog.EventType"], ["goog.asserts", "goog.dom", "goog.dom.NodeType", "goog.dom.TagName", "goog.dom.a11y", "goog.dom.classes", "goog.events.Event", "goog.events.EventType", "goog.events.KeyCodes", "goog.fx.Dragger", "goog.math.Rect", "goog.structs", "goog.structs.Map", "goog.style", "goog.ui.ModalPopup", "goog.userAgent"]);
goog.addDependency("/ui/dimensionpicker.js", ["goog.ui.DimensionPicker"], ["goog.events.EventType", "goog.math.Size", "goog.ui.Control", "goog.ui.DimensionPickerRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/dimensionpickerrenderer.js", ["goog.ui.DimensionPickerRenderer"], ["goog.dom", "goog.dom.TagName", "goog.i18n.bidi", "goog.style", "goog.ui.ControlRenderer", "goog.userAgent"]);
goog.addDependency("/ui/dragdropdetector.js", ["goog.ui.DragDropDetector", "goog.ui.DragDropDetector.EventType", "goog.ui.DragDropDetector.ImageDropEvent", "goog.ui.DragDropDetector.LinkDropEvent"], ["goog.dom", "goog.dom.TagName", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.math.Coordinate", "goog.string", "goog.style", "goog.userAgent"]);
goog.addDependency("/ui/drilldownrow.js", ["goog.ui.DrilldownRow"], ["goog.dom", "goog.dom.classes", "goog.events", "goog.ui.Component"]);
goog.addDependency("/ui/editor/abstractdialog.js", ["goog.ui.editor.AbstractDialog", "goog.ui.editor.AbstractDialog.Builder", "goog.ui.editor.AbstractDialog.EventType"], ["goog.dom", "goog.dom.classes", "goog.events.EventTarget", "goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.Dialog.DefaultButtonKeys", "goog.ui.Dialog.Event", "goog.ui.Dialog.EventType"]);
goog.addDependency("/ui/editor/bubble.js", ["goog.ui.editor.Bubble"], ["goog.debug.Logger", "goog.dom", "goog.dom.ViewportSizeMonitor", "goog.editor.style", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.math.Box", "goog.positioning", "goog.string", "goog.style", "goog.ui.Component.EventType", "goog.ui.PopupBase", "goog.ui.PopupBase.EventType", "goog.userAgent"]);
goog.addDependency("/ui/editor/defaulttoolbar.js", ["goog.ui.editor.DefaultToolbar"], ["goog.dom", "goog.dom.TagName", "goog.dom.classes", "goog.editor.Command", "goog.string.StringBuffer", "goog.style", "goog.ui.ControlContent", "goog.ui.editor.ToolbarFactory", "goog.ui.editor.messages"]);
goog.addDependency("/ui/editor/equationeditordialog.js", ["goog.ui.editor.EquationEditorDialog"], ["goog.editor.Command", "goog.ui.editor.AbstractDialog", "goog.ui.editor.EquationEditorOkEvent", "goog.ui.equation.ChangeEvent", "goog.ui.equation.TexEditor"]);
goog.addDependency("/ui/editor/equationeditorokevent.js", ["goog.ui.editor.EquationEditorOkEvent"], ["goog.events.Event", "goog.ui.editor.AbstractDialog"]);
goog.addDependency("/ui/editor/linkdialog.js", ["goog.ui.editor.LinkDialog", "goog.ui.editor.LinkDialog.BeforeTestLinkEvent", "goog.ui.editor.LinkDialog.EventType", "goog.ui.editor.LinkDialog.OkEvent"], ["goog.dom", "goog.dom.DomHelper", "goog.dom.TagName", "goog.dom.classes", "goog.dom.selection", "goog.editor.BrowserFeature", "goog.editor.Link", "goog.editor.focus", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.events.InputHandler", "goog.events.InputHandler.EventType", "goog.string", "goog.style", "goog.ui.Button", "goog.ui.LinkButtonRenderer", "goog.ui.editor.AbstractDialog", "goog.ui.editor.AbstractDialog.Builder", "goog.ui.editor.AbstractDialog.EventType", "goog.ui.editor.TabPane", "goog.ui.editor.messages", "goog.userAgent", "goog.window"]);
goog.addDependency("/ui/editor/messages.js", ["goog.ui.editor.messages"], []);
goog.addDependency("/ui/editor/tabpane.js", ["goog.ui.editor.TabPane"], ["goog.dom.TagName", "goog.events.EventHandler", "goog.ui.Component", "goog.ui.Control", "goog.ui.Tab", "goog.ui.TabBar"]);
goog.addDependency("/ui/editor/toolbarcontroller.js", ["goog.ui.editor.ToolbarController"], ["goog.editor.Field.EventType", "goog.events.EventHandler", "goog.events.EventTarget", "goog.ui.Component.EventType"]);
goog.addDependency("/ui/editor/toolbarfactory.js", ["goog.ui.editor.ToolbarFactory"], ["goog.array", "goog.dom", "goog.string", "goog.string.Unicode", "goog.style", "goog.ui.Component.State", "goog.ui.Container.Orientation", "goog.ui.ControlContent", "goog.ui.Option", "goog.ui.Toolbar", "goog.ui.ToolbarButton", "goog.ui.ToolbarColorMenuButton", "goog.ui.ToolbarMenuButton", "goog.ui.ToolbarRenderer", "goog.ui.ToolbarSelect", "goog.userAgent"]);
goog.addDependency("/ui/emoji/emoji.js", ["goog.ui.emoji.Emoji"], []);
goog.addDependency("/ui/emoji/emojipalette.js", ["goog.ui.emoji.EmojiPalette"], ["goog.events.Event", "goog.events.EventType", "goog.net.ImageLoader", "goog.ui.Palette", "goog.ui.emoji.Emoji", "goog.ui.emoji.EmojiPaletteRenderer"]);
goog.addDependency("/ui/emoji/emojipaletterenderer.js", ["goog.ui.emoji.EmojiPaletteRenderer"], ["goog.dom", "goog.dom.a11y", "goog.ui.PaletteRenderer", "goog.ui.emoji.Emoji", "goog.ui.emoji.SpriteInfo"]);
goog.addDependency("/ui/emoji/emojipicker.js", ["goog.ui.emoji.EmojiPicker"], ["goog.debug.Logger", "goog.dom", "goog.ui.Component", "goog.ui.TabPane", "goog.ui.TabPane.TabPage", "goog.ui.emoji.Emoji", "goog.ui.emoji.EmojiPalette", "goog.ui.emoji.EmojiPaletteRenderer", "goog.ui.emoji.ProgressiveEmojiPaletteRenderer"]);
goog.addDependency("/ui/emoji/popupemojipicker.js", ["goog.ui.emoji.PopupEmojiPicker"], ["goog.dom", "goog.events.EventType", "goog.positioning.AnchoredPosition", "goog.ui.Component", "goog.ui.Popup", "goog.ui.emoji.EmojiPicker"]);
goog.addDependency("/ui/emoji/progressiveemojipaletterenderer.js", ["goog.ui.emoji.ProgressiveEmojiPaletteRenderer"], ["goog.ui.emoji.EmojiPaletteRenderer"]);
goog.addDependency("/ui/emoji/spriteinfo.js", ["goog.ui.emoji.SpriteInfo"], []);
goog.addDependency("/ui/equation/arrowpalette.js", ["goog.ui.equation.ArrowPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/ui/equation/changeevent.js", ["goog.ui.equation.ChangeEvent"], ["goog.events.Event", "goog.events.EventType"]);
goog.addDependency("/ui/equation/comparisonpalette.js", ["goog.ui.equation.ComparisonPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/ui/equation/editorpane.js", ["goog.ui.equation.EditorPane"], ["goog.dom", "goog.style", "goog.ui.Component"]);
goog.addDependency("/ui/equation/equationeditor.js", ["goog.ui.equation.EquationEditor"], ["goog.dom", "goog.events", "goog.ui.Component", "goog.ui.Tab", "goog.ui.TabBar", "goog.ui.equation.EditorPane", "goog.ui.equation.ImageRenderer", "goog.ui.equation.TexPane"]);
goog.addDependency("/ui/equation/equationeditordialog.js", ["goog.ui.equation.EquationEditorDialog"], ["goog.dom", "goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.equation.EquationEditor", "goog.ui.equation.ImageRenderer", "goog.ui.equation.TexEditor"]);
goog.addDependency("/ui/equation/greekpalette.js", ["goog.ui.equation.GreekPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/ui/equation/imagerenderer.js", ["goog.ui.equation.ImageRenderer"], ["goog.dom.TagName", "goog.dom.classes", "goog.string", "goog.uri.utils"]);
goog.addDependency("/ui/equation/mathpalette.js", ["goog.ui.equation.MathPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/ui/equation/menupalette.js", ["goog.ui.equation.MenuPalette", "goog.ui.equation.MenuPaletteRenderer"], ["goog.math.Size", "goog.style", "goog.ui.equation.Palette", "goog.ui.equation.PaletteRenderer"]);
goog.addDependency("/ui/equation/palette.js", ["goog.ui.equation.Palette", "goog.ui.equation.PaletteEvent", "goog.ui.equation.PaletteRenderer"], ["goog.dom", "goog.dom.TagName", "goog.ui.Palette", "goog.ui.equation.ImageRenderer"]);
goog.addDependency("/ui/equation/palettemanager.js", ["goog.ui.equation.PaletteManager"], ["goog.Timer", "goog.events.EventTarget", "goog.ui.equation.ArrowPalette", "goog.ui.equation.ComparisonPalette", "goog.ui.equation.GreekPalette", "goog.ui.equation.MathPalette", "goog.ui.equation.MenuPalette", "goog.ui.equation.Palette", "goog.ui.equation.SymbolPalette"]);
goog.addDependency("/ui/equation/symbolpalette.js", ["goog.ui.equation.SymbolPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/ui/equation/texeditor.js", ["goog.ui.equation.TexEditor"], ["goog.dom", "goog.ui.Component", "goog.ui.equation.ImageRenderer", "goog.ui.equation.TexPane"]);
goog.addDependency("/ui/equation/texpane.js", ["goog.ui.equation.TexPane"], ["goog.Timer", "goog.dom", "goog.dom.TagName", "goog.dom.selection", "goog.events", "goog.events.EventType", "goog.events.InputHandler", "goog.string", "goog.style", "goog.ui.Component", "goog.ui.equation.ChangeEvent", "goog.ui.equation.EditorPane", "goog.ui.equation.ImageRenderer", "goog.ui.equation.PaletteManager"]);
goog.addDependency("/ui/filteredmenu.js", ["goog.ui.FilteredMenu"], ["goog.dom", "goog.events.EventType", "goog.events.InputHandler", "goog.events.KeyCodes", "goog.string", "goog.ui.FilterObservingMenuItem", "goog.ui.Menu"]);
goog.addDependency("/ui/filterobservingmenuitem.js", ["goog.ui.FilterObservingMenuItem"], ["goog.ui.ControlContent", "goog.ui.FilterObservingMenuItemRenderer", "goog.ui.MenuItem", "goog.ui.registry"]);
goog.addDependency("/ui/filterobservingmenuitemrenderer.js", ["goog.ui.FilterObservingMenuItemRenderer"], ["goog.ui.MenuItemRenderer"]);
goog.addDependency("/ui/flatbuttonrenderer.js", ["goog.ui.FlatButtonRenderer"], ["goog.dom.classes", "goog.ui.Button", "goog.ui.ButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.registry"]);
goog.addDependency("/ui/flatmenubuttonrenderer.js", ["goog.ui.FlatMenuButtonRenderer"], ["goog.style", "goog.ui.ControlContent", "goog.ui.FlatButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.Menu", "goog.ui.MenuButton", "goog.ui.MenuRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/formpost.js", ["goog.ui.FormPost"], ["goog.array", "goog.dom.TagName", "goog.string", "goog.string.StringBuffer", "goog.ui.Component"]);
goog.addDependency("/ui/gauge.js", ["goog.ui.Gauge", "goog.ui.GaugeColoredRange"], ["goog.dom", "goog.dom.a11y", "goog.fx.Animation", "goog.fx.Animation.EventType", "goog.fx.Transition.EventType", "goog.fx.easing", "goog.graphics", "goog.graphics.Font", "goog.graphics.Path", "goog.graphics.SolidFill", "goog.ui.Component", "goog.ui.GaugeTheme"]);
goog.addDependency("/ui/gaugetheme.js", ["goog.ui.GaugeTheme"], ["goog.graphics.LinearGradient", "goog.graphics.SolidFill", "goog.graphics.Stroke"]);
goog.addDependency("/ui/hovercard.js", ["goog.ui.HoverCard", "goog.ui.HoverCard.EventType", "goog.ui.HoverCard.TriggerEvent"], ["goog.dom", "goog.events", "goog.events.EventType", "goog.ui.AdvancedTooltip"]);
goog.addDependency("/ui/hsvapalette.js", ["goog.ui.HsvaPalette"], ["goog.array", "goog.color", "goog.color.alpha", "goog.events.EventType", "goog.ui.Component.EventType", "goog.ui.HsvPalette"]);
goog.addDependency("/ui/hsvpalette.js", ["goog.ui.HsvPalette"], ["goog.color", "goog.dom", "goog.dom.DomHelper", "goog.events", "goog.events.Event", "goog.events.EventType", "goog.events.InputHandler", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.userAgent"]);
goog.addDependency("/ui/idgenerator.js", ["goog.ui.IdGenerator"], []);
goog.addDependency("/ui/idletimer.js", ["goog.ui.IdleTimer"], ["goog.Timer", "goog.events", "goog.events.EventTarget", "goog.structs.Set", "goog.ui.ActivityMonitor"]);
goog.addDependency("/ui/iframemask.js", ["goog.ui.IframeMask"], ["goog.Disposable", "goog.Timer", "goog.dom", "goog.dom.DomHelper", "goog.dom.iframe", "goog.events.EventHandler", "goog.events.EventTarget", "goog.style"]);
goog.addDependency("/ui/imagelessbuttonrenderer.js", ["goog.ui.ImagelessButtonRenderer"], ["goog.ui.Button", "goog.ui.ControlContent", "goog.ui.CustomButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.registry"]);
goog.addDependency("/ui/imagelessmenubuttonrenderer.js", ["goog.ui.ImagelessMenuButtonRenderer"], ["goog.dom", "goog.dom.TagName", "goog.ui.ControlContent", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.MenuButton", "goog.ui.MenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/imagelessroundedcorner.js", ["goog.ui.AbstractImagelessRoundedCorner", "goog.ui.CanvasRoundedCorner", "goog.ui.ImagelessRoundedCorner", "goog.ui.VmlRoundedCorner"], ["goog.dom.DomHelper", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.graphics.Path", "goog.graphics.VmlGraphics", "goog.userAgent"]);
goog.addDependency("/ui/inputdatepicker.js", ["goog.ui.InputDatePicker"], ["goog.date.DateTime", "goog.dom", "goog.i18n.DateTimeParse", "goog.string", "goog.ui.Component", "goog.ui.PopupDatePicker"]);
goog.addDependency("/ui/itemevent.js", ["goog.ui.ItemEvent"], ["goog.events.Event"]);
goog.addDependency("/ui/keyboardshortcuthandler.js", ["goog.ui.KeyboardShortcutEvent", "goog.ui.KeyboardShortcutHandler", "goog.ui.KeyboardShortcutHandler.EventType"], ["goog.Timer", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyNames", "goog.object"]);
goog.addDependency("/ui/labelinput.js", ["goog.ui.LabelInput"], ["goog.Timer", "goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.dom.classes", "goog.events.EventHandler", "goog.events.EventType", "goog.ui.Component", "goog.userAgent"]);
goog.addDependency("/ui/linkbuttonrenderer.js", ["goog.ui.LinkButtonRenderer"], ["goog.ui.Button", "goog.ui.FlatButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/media/flashobject.js", ["goog.ui.media.FlashObject", "goog.ui.media.FlashObject.ScriptAccessLevel", "goog.ui.media.FlashObject.Wmodes"], ["goog.asserts", "goog.debug.Logger", "goog.events.EventHandler", "goog.string", "goog.structs.Map", "goog.style", "goog.ui.Component", "goog.ui.Component.Error", "goog.userAgent", "goog.userAgent.flash"]);
goog.addDependency("/ui/media/flickr.js", ["goog.ui.media.FlickrSet", "goog.ui.media.FlickrSetModel"], ["goog.object", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/ui/media/googlevideo.js", ["goog.ui.media.GoogleVideo", "goog.ui.media.GoogleVideoModel"], ["goog.string", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/ui/media/media.js", ["goog.ui.media.Media", "goog.ui.media.MediaRenderer"], ["goog.style", "goog.ui.Component.State", "goog.ui.Control", "goog.ui.ControlRenderer"]);
goog.addDependency("/ui/media/mediamodel.js", ["goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Category", "goog.ui.media.MediaModel.Credit", "goog.ui.media.MediaModel.Credit.Role", "goog.ui.media.MediaModel.Credit.Scheme", "goog.ui.media.MediaModel.Medium", "goog.ui.media.MediaModel.MimeType", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaModel.SubTitle", "goog.ui.media.MediaModel.Thumbnail"], ["goog.array"]);
goog.addDependency("/ui/media/mp3.js", ["goog.ui.media.Mp3"], ["goog.string", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/ui/media/photo.js", ["goog.ui.media.Photo"], ["goog.ui.media.Media", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/ui/media/picasa.js", ["goog.ui.media.PicasaAlbum", "goog.ui.media.PicasaAlbumModel"], ["goog.object", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/ui/media/vimeo.js", ["goog.ui.media.Vimeo", "goog.ui.media.VimeoModel"], ["goog.string", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/ui/media/youtube.js", ["goog.ui.media.Youtube", "goog.ui.media.YoutubeModel"], ["goog.string", "goog.ui.Component.Error", "goog.ui.Component.State", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaModel.Thumbnail", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/ui/menu.js", ["goog.ui.Menu", "goog.ui.Menu.EventType"], ["goog.math.Coordinate", "goog.string", "goog.style", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.Container", "goog.ui.Container.Orientation", "goog.ui.MenuHeader", "goog.ui.MenuItem", "goog.ui.MenuRenderer", "goog.ui.MenuSeparator"]);
goog.addDependency("/ui/menubase.js", ["goog.ui.MenuBase"], ["goog.events.EventHandler", "goog.events.EventType", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.ui.Popup"]);
goog.addDependency("/ui/menubutton.js", ["goog.ui.MenuButton"], ["goog.Timer", "goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler.EventType", "goog.math.Box", "goog.math.Rect", "goog.positioning", "goog.positioning.Corner", "goog.positioning.MenuAnchoredPosition", "goog.style", "goog.ui.Button", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.Menu", "goog.ui.MenuButtonRenderer", "goog.ui.registry", "goog.userAgent", "goog.userAgent.product"]);
goog.addDependency("/ui/menubuttonrenderer.js", ["goog.ui.MenuButtonRenderer"], ["goog.dom", "goog.style", "goog.ui.CustomButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.Menu", "goog.ui.MenuRenderer", "goog.userAgent"]);
goog.addDependency("/ui/menuheader.js", ["goog.ui.MenuHeader"], ["goog.ui.Component.State", "goog.ui.Control", "goog.ui.MenuHeaderRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/menuheaderrenderer.js", ["goog.ui.MenuHeaderRenderer"], ["goog.dom", "goog.dom.classes", "goog.ui.ControlRenderer"]);
goog.addDependency("/ui/menuitem.js", ["goog.ui.MenuItem"], ["goog.array", "goog.dom", "goog.dom.classes", "goog.events.KeyCodes", "goog.math.Coordinate", "goog.string", "goog.ui.Component.State", "goog.ui.Control", "goog.ui.ControlContent", "goog.ui.MenuItemRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/menuitemrenderer.js", ["goog.ui.MenuItemRenderer"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.classes", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.ControlRenderer"]);
goog.addDependency("/ui/menurenderer.js", ["goog.ui.MenuRenderer"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.ui.ContainerRenderer", "goog.ui.Separator"]);
goog.addDependency("/ui/menuseparator.js", ["goog.ui.MenuSeparator"], ["goog.ui.MenuSeparatorRenderer", "goog.ui.Separator", "goog.ui.registry"]);
goog.addDependency("/ui/menuseparatorrenderer.js", ["goog.ui.MenuSeparatorRenderer"], ["goog.dom", "goog.dom.classes", "goog.ui.ControlContent", "goog.ui.ControlRenderer"]);
goog.addDependency("/ui/mockactivitymonitor.js", ["goog.ui.MockActivityMonitor"], ["goog.events.EventType", "goog.ui.ActivityMonitor"]);
goog.addDependency("/ui/modalpopup.js", ["goog.ui.ModalPopup"], ["goog.Timer", "goog.asserts", "goog.dom", "goog.dom.TagName", "goog.dom.classes", "goog.dom.iframe", "goog.events", "goog.events.EventType", "goog.events.FocusHandler", "goog.fx.Transition", "goog.style", "goog.ui.Component", "goog.ui.PopupBase.EventType", "goog.userAgent"]);
goog.addDependency("/ui/nativebuttonrenderer.js", ["goog.ui.NativeButtonRenderer"], ["goog.dom.classes", "goog.events.EventType", "goog.ui.ButtonRenderer", "goog.ui.Component.State"]);
goog.addDependency("/ui/offlineinstalldialog.js", ["goog.ui.OfflineInstallDialog", "goog.ui.OfflineInstallDialog.ButtonKeyType", "goog.ui.OfflineInstallDialog.EnableScreen", "goog.ui.OfflineInstallDialog.InstallScreen", "goog.ui.OfflineInstallDialog.InstallingGearsScreen", "goog.ui.OfflineInstallDialog.ScreenType", "goog.ui.OfflineInstallDialog.UpgradeScreen", "goog.ui.OfflineInstallDialogScreen"], ["goog.Disposable", "goog.dom.classes", "goog.gears", "goog.string", "goog.string.StringBuffer", "goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.Dialog.EventType", "goog.window"]);
goog.addDependency("/ui/offlinestatuscard.js", ["goog.ui.OfflineStatusCard", "goog.ui.OfflineStatusCard.EventType"], ["goog.dom", "goog.events.EventType", "goog.gears.StatusType", "goog.structs.Map", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.ProgressBar"]);
goog.addDependency("/ui/offlinestatuscomponent.js", ["goog.ui.OfflineStatusComponent", "goog.ui.OfflineStatusComponent.StatusClassNames"], ["goog.dom.classes", "goog.events.EventType", "goog.gears.StatusType", "goog.positioning", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.positioning.Overflow", "goog.ui.Component", "goog.ui.OfflineStatusCard.EventType", "goog.ui.Popup"]);
goog.addDependency("/ui/option.js", ["goog.ui.Option"], ["goog.ui.Component.EventType", "goog.ui.ControlContent", "goog.ui.MenuItem", "goog.ui.registry"]);
goog.addDependency("/ui/palette.js", ["goog.ui.Palette"], ["goog.array", "goog.dom", "goog.events.EventType", "goog.events.KeyCodes", "goog.math.Size", "goog.ui.Component.Error", "goog.ui.Component.EventType", "goog.ui.Control", "goog.ui.PaletteRenderer", "goog.ui.SelectionModel"]);
goog.addDependency("/ui/paletterenderer.js", ["goog.ui.PaletteRenderer"], ["goog.array", "goog.dom", "goog.dom.NodeType", "goog.dom.a11y", "goog.dom.classes", "goog.style", "goog.ui.ControlRenderer", "goog.userAgent"]);
goog.addDependency("/ui/plaintextspellchecker.js", ["goog.ui.PlainTextSpellChecker"], ["goog.Timer", "goog.dom", "goog.dom.a11y", "goog.events.EventHandler", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.style", "goog.ui.AbstractSpellChecker", "goog.ui.AbstractSpellChecker.AsyncResult", "goog.ui.Component.EventType", "goog.userAgent"]);
goog.addDependency("/ui/popup.js", ["goog.ui.Popup", "goog.ui.Popup.AbsolutePosition", "goog.ui.Popup.AnchoredPosition", "goog.ui.Popup.AnchoredViewPortPosition", "goog.ui.Popup.ClientPosition", "goog.ui.Popup.Corner", "goog.ui.Popup.Overflow", "goog.ui.Popup.ViewPortClientPosition", "goog.ui.Popup.ViewPortPosition"], ["goog.math.Box", "goog.positioning", "goog.positioning.AbsolutePosition", "goog.positioning.AnchoredPosition", "goog.positioning.AnchoredViewportPosition", "goog.positioning.ClientPosition", "goog.positioning.Corner", "goog.positioning.Overflow", "goog.positioning.OverflowStatus", "goog.positioning.ViewportClientPosition", "goog.positioning.ViewportPosition", "goog.style", "goog.ui.PopupBase"]);
goog.addDependency("/ui/popupbase.js", ["goog.ui.PopupBase", "goog.ui.PopupBase.EventType", "goog.ui.PopupBase.Type"], ["goog.Timer", "goog.dom", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.fx.Transition", "goog.fx.Transition.EventType", "goog.style", "goog.userAgent"]);
goog.addDependency("/ui/popupcolorpicker.js", ["goog.ui.PopupColorPicker"], ["goog.dom.classes", "goog.events.EventType", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.ui.ColorPicker", "goog.ui.ColorPicker.EventType", "goog.ui.Component", "goog.ui.Popup"]);
goog.addDependency("/ui/popupdatepicker.js", ["goog.ui.PopupDatePicker"], ["goog.events.EventType", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.style", "goog.ui.Component", "goog.ui.DatePicker", "goog.ui.DatePicker.Events", "goog.ui.Popup", "goog.ui.PopupBase.EventType"]);
goog.addDependency("/ui/popupmenu.js", ["goog.ui.PopupMenu"], ["goog.events.EventType", "goog.positioning.AnchoredViewportPosition", "goog.positioning.Corner", "goog.positioning.MenuAnchoredPosition", "goog.positioning.ViewportClientPosition", "goog.structs", "goog.structs.Map", "goog.style", "goog.ui.Component.EventType", "goog.ui.Menu", "goog.ui.PopupBase", "goog.userAgent"]);
goog.addDependency("/ui/progressbar.js", ["goog.ui.ProgressBar", "goog.ui.ProgressBar.Orientation"], ["goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.events", "goog.events.EventType", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.RangeModel", "goog.userAgent"]);
goog.addDependency("/ui/prompt.js", ["goog.ui.Prompt"], ["goog.Timer", "goog.dom", "goog.events", "goog.events.EventType", "goog.functions", "goog.ui.Component.Error", "goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.Dialog.DefaultButtonKeys", "goog.ui.Dialog.EventType", "goog.userAgent"]);
goog.addDependency("/ui/rangemodel.js", ["goog.ui.RangeModel"], ["goog.events.EventTarget", "goog.ui.Component.EventType"]);
goog.addDependency("/ui/ratings.js", ["goog.ui.Ratings", "goog.ui.Ratings.EventType"], ["goog.dom.a11y", "goog.dom.classes", "goog.events.EventType", "goog.ui.Component"]);
goog.addDependency("/ui/registry.js", ["goog.ui.registry"], ["goog.dom.classes"]);
goog.addDependency("/ui/richtextspellchecker.js", ["goog.ui.RichTextSpellChecker"], ["goog.Timer", "goog.dom", "goog.dom.NodeType", "goog.events", "goog.events.EventType", "goog.string.StringBuffer", "goog.ui.AbstractSpellChecker", "goog.ui.AbstractSpellChecker.AsyncResult"]);
goog.addDependency("/ui/roundedpanel.js", ["goog.ui.BaseRoundedPanel", "goog.ui.CssRoundedPanel", "goog.ui.GraphicsRoundedPanel", "goog.ui.RoundedPanel", "goog.ui.RoundedPanel.Corner"], ["goog.dom", "goog.dom.classes", "goog.graphics", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.math.Coordinate", "goog.style", "goog.ui.Component", "goog.userAgent"]);
goog.addDependency("/ui/roundedtabrenderer.js", ["goog.ui.RoundedTabRenderer"], ["goog.dom", "goog.ui.Tab", "goog.ui.TabBar.Location", "goog.ui.TabRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/scrollfloater.js", ["goog.ui.ScrollFloater", "goog.ui.ScrollFloater.EventType"], ["goog.dom", "goog.dom.classes", "goog.events.EventType", "goog.object", "goog.style", "goog.ui.Component", "goog.userAgent"]);
goog.addDependency("/ui/select.js", ["goog.ui.Select"], ["goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.events.EventType", "goog.ui.Component.EventType", "goog.ui.ControlContent", "goog.ui.MenuButton", "goog.ui.SelectionModel", "goog.ui.registry"]);
goog.addDependency("/ui/selectionmenubutton.js", ["goog.ui.SelectionMenuButton", "goog.ui.SelectionMenuButton.SelectionState"], ["goog.events.EventType", "goog.ui.Component.EventType", "goog.ui.Menu", "goog.ui.MenuButton", "goog.ui.MenuItem"]);
goog.addDependency("/ui/selectionmodel.js", ["goog.ui.SelectionModel"], ["goog.array", "goog.events.EventTarget", "goog.events.EventType"]);
goog.addDependency("/ui/separator.js", ["goog.ui.Separator"], ["goog.dom.a11y", "goog.ui.Component.State", "goog.ui.Control", "goog.ui.MenuSeparatorRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/serverchart.js", ["goog.ui.ServerChart", "goog.ui.ServerChart.AxisDisplayType", "goog.ui.ServerChart.ChartType", "goog.ui.ServerChart.EncodingType", "goog.ui.ServerChart.Event", "goog.ui.ServerChart.LegendPosition", "goog.ui.ServerChart.MaximumValue", "goog.ui.ServerChart.MultiAxisAlignment", "goog.ui.ServerChart.MultiAxisType", "goog.ui.ServerChart.UriParam", "goog.ui.ServerChart.UriTooLongEvent"], ["goog.Uri", "goog.array", "goog.asserts", "goog.events.Event", "goog.string", "goog.ui.Component"]);
goog.addDependency("/ui/slider.js", ["goog.ui.Slider", "goog.ui.Slider.Orientation"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.ui.SliderBase", "goog.ui.SliderBase.Orientation"]);
goog.addDependency("/ui/sliderbase.js", ["goog.ui.SliderBase", "goog.ui.SliderBase.Orientation"], ["goog.Timer", "goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.dom.classes", "goog.events", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.events.MouseWheelHandler", "goog.events.MouseWheelHandler.EventType", "goog.fx.AnimationParallelQueue", "goog.fx.Dragger", "goog.fx.Dragger.EventType", "goog.fx.Transition.EventType", "goog.fx.dom.ResizeHeight", "goog.fx.dom.ResizeWidth", "goog.fx.dom.Slide", "goog.math", "goog.math.Coordinate", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.RangeModel"]);
goog.addDependency("/ui/splitbehavior.js", ["goog.ui.SplitBehavior", "goog.ui.SplitBehavior.DefaultHandlers"], ["goog.Disposable", "goog.array", "goog.dispose", "goog.dom", "goog.dom.DomHelper", "goog.dom.classes", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.string", "goog.ui.ButtonSide", "goog.ui.Component", "goog.ui.Component.Error", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.decorate", "goog.ui.registry"]);
goog.addDependency("/ui/splitpane.js", ["goog.ui.SplitPane", "goog.ui.SplitPane.Orientation"], ["goog.dom", "goog.dom.classes", "goog.events.EventType", "goog.fx.Dragger", "goog.fx.Dragger.EventType", "goog.math.Rect", "goog.math.Size", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.userAgent"]);
goog.addDependency("/ui/style/app/buttonrenderer.js", ["goog.ui.style.app.ButtonRenderer"], ["goog.ui.Button", "goog.ui.ControlContent", "goog.ui.CustomButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.registry"]);
goog.addDependency("/ui/style/app/menubuttonrenderer.js", ["goog.ui.style.app.MenuButtonRenderer"], ["goog.array", "goog.dom", "goog.dom.a11y.Role", "goog.style", "goog.ui.ControlContent", "goog.ui.Menu", "goog.ui.MenuRenderer", "goog.ui.style.app.ButtonRenderer"]);
goog.addDependency("/ui/style/app/primaryactionbuttonrenderer.js", ["goog.ui.style.app.PrimaryActionButtonRenderer"], ["goog.ui.Button", "goog.ui.registry", "goog.ui.style.app.ButtonRenderer"]);
goog.addDependency("/ui/submenu.js", ["goog.ui.SubMenu"], ["goog.Timer", "goog.dom", "goog.dom.classes", "goog.events.KeyCodes", "goog.positioning.AnchoredViewportPosition", "goog.positioning.Corner", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.Menu", "goog.ui.MenuItem", "goog.ui.SubMenuRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/submenurenderer.js", ["goog.ui.SubMenuRenderer"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.dom.classes", "goog.style", "goog.ui.Menu", "goog.ui.MenuItemRenderer"]);
goog.addDependency("/ui/tab.js", ["goog.ui.Tab"], ["goog.ui.Component.State", "goog.ui.Control", "goog.ui.ControlContent", "goog.ui.TabRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/tabbar.js", ["goog.ui.TabBar", "goog.ui.TabBar.Location"], ["goog.ui.Component.EventType", "goog.ui.Container", "goog.ui.Container.Orientation", "goog.ui.Tab", "goog.ui.TabBarRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/tabbarrenderer.js", ["goog.ui.TabBarRenderer"], ["goog.dom.a11y.Role", "goog.object", "goog.ui.ContainerRenderer"]);
goog.addDependency("/ui/tablesorter.js", ["goog.ui.TableSorter", "goog.ui.TableSorter.EventType"], ["goog.array", "goog.dom", "goog.dom.TagName", "goog.dom.classes", "goog.events", "goog.events.EventType", "goog.functions", "goog.ui.Component"]);
goog.addDependency("/ui/tabpane.js", ["goog.ui.TabPane", "goog.ui.TabPane.Events", "goog.ui.TabPane.TabLocation", "goog.ui.TabPane.TabPage", "goog.ui.TabPaneEvent"], ["goog.dom", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.style"]);
goog.addDependency("/ui/tabrenderer.js", ["goog.ui.TabRenderer"], ["goog.dom.a11y.Role", "goog.ui.Component.State", "goog.ui.ControlRenderer"]);
goog.addDependency("/ui/textarea.js", ["goog.ui.Textarea"], ["goog.Timer", "goog.events.EventType", "goog.events.KeyCodes", "goog.style", "goog.ui.Control", "goog.ui.TextareaRenderer", "goog.userAgent", "goog.userAgent.product"]);
goog.addDependency("/ui/textarearenderer.js", ["goog.ui.TextareaRenderer"], ["goog.ui.Component.State", "goog.ui.ControlRenderer"]);
goog.addDependency("/ui/togglebutton.js", ["goog.ui.ToggleButton"], ["goog.ui.Button", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.CustomButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/toolbar.js", ["goog.ui.Toolbar"], ["goog.ui.Container", "goog.ui.ToolbarRenderer"]);
goog.addDependency("/ui/toolbarbutton.js", ["goog.ui.ToolbarButton"], ["goog.ui.Button", "goog.ui.ControlContent", "goog.ui.ToolbarButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/toolbarbuttonrenderer.js", ["goog.ui.ToolbarButtonRenderer"], ["goog.ui.CustomButtonRenderer"]);
goog.addDependency("/ui/toolbarcolormenubutton.js", ["goog.ui.ToolbarColorMenuButton"], ["goog.ui.ColorMenuButton", "goog.ui.ControlContent", "goog.ui.ToolbarColorMenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/toolbarcolormenubuttonrenderer.js", ["goog.ui.ToolbarColorMenuButtonRenderer"], ["goog.dom.classes", "goog.ui.ColorMenuButtonRenderer", "goog.ui.ControlContent", "goog.ui.MenuButtonRenderer", "goog.ui.ToolbarMenuButtonRenderer"]);
goog.addDependency("/ui/toolbarmenubutton.js", ["goog.ui.ToolbarMenuButton"], ["goog.ui.ControlContent", "goog.ui.MenuButton", "goog.ui.ToolbarMenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/toolbarmenubuttonrenderer.js", ["goog.ui.ToolbarMenuButtonRenderer"], ["goog.ui.MenuButtonRenderer"]);
goog.addDependency("/ui/toolbarrenderer.js", ["goog.ui.ToolbarRenderer"], ["goog.dom.a11y.Role", "goog.ui.Container.Orientation", "goog.ui.ContainerRenderer", "goog.ui.Separator", "goog.ui.ToolbarSeparatorRenderer"]);
goog.addDependency("/ui/toolbarselect.js", ["goog.ui.ToolbarSelect"], ["goog.ui.ControlContent", "goog.ui.Select", "goog.ui.ToolbarMenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/toolbarseparator.js", ["goog.ui.ToolbarSeparator"], ["goog.ui.Separator", "goog.ui.ToolbarSeparatorRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/toolbarseparatorrenderer.js", ["goog.ui.ToolbarSeparatorRenderer"], ["goog.dom.classes", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.MenuSeparatorRenderer"]);
goog.addDependency("/ui/toolbartogglebutton.js", ["goog.ui.ToolbarToggleButton"], ["goog.ui.ControlContent", "goog.ui.ToggleButton", "goog.ui.ToolbarButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/tooltip.js", ["goog.ui.Tooltip", "goog.ui.Tooltip.CursorTooltipPosition", "goog.ui.Tooltip.ElementTooltipPosition", "goog.ui.Tooltip.State"], ["goog.Timer", "goog.array", "goog.dom", "goog.events", "goog.events.EventType", "goog.math.Box", "goog.math.Coordinate", "goog.positioning", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.positioning.Overflow", "goog.positioning.OverflowStatus", "goog.positioning.ViewportPosition", "goog.structs.Set", "goog.style", "goog.ui.Popup", "goog.ui.PopupBase"]);
goog.addDependency("/ui/tree/basenode.js", ["goog.ui.tree.BaseNode", "goog.ui.tree.BaseNode.EventType"], ["goog.Timer", "goog.asserts", "goog.dom.a11y", "goog.events.KeyCodes", "goog.string", "goog.string.StringBuffer", "goog.style", "goog.ui.Component", "goog.userAgent"]);
goog.addDependency("/ui/tree/treecontrol.js", ["goog.ui.tree.TreeControl"], ["goog.debug.Logger", "goog.dom.a11y", "goog.dom.classes", "goog.events.EventType", "goog.events.FocusHandler", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.ui.tree.BaseNode", "goog.ui.tree.TreeNode", "goog.ui.tree.TypeAhead", "goog.userAgent"]);
goog.addDependency("/ui/tree/treenode.js", ["goog.ui.tree.TreeNode"], ["goog.ui.tree.BaseNode"]);
goog.addDependency("/ui/tree/typeahead.js", ["goog.ui.tree.TypeAhead", "goog.ui.tree.TypeAhead.Offset"], ["goog.array", "goog.events.KeyCodes", "goog.string", "goog.structs.Trie"]);
goog.addDependency("/ui/tristatemenuitem.js", ["goog.ui.TriStateMenuItem", "goog.ui.TriStateMenuItem.State"], ["goog.dom.classes", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.MenuItem", "goog.ui.TriStateMenuItemRenderer", "goog.ui.registry"]);
goog.addDependency("/ui/tristatemenuitemrenderer.js", ["goog.ui.TriStateMenuItemRenderer"], ["goog.dom.classes", "goog.ui.MenuItemRenderer"]);
goog.addDependency("/ui/twothumbslider.js", ["goog.ui.TwoThumbSlider"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.ui.SliderBase"]);
goog.addDependency("/ui/zippy.js", ["goog.ui.Zippy", "goog.ui.Zippy.Events", "goog.ui.ZippyEvent"], ["goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.style"]);
goog.addDependency("/uri/uri.js", ["goog.Uri", "goog.Uri.QueryData"], ["goog.array", "goog.string", "goog.structs", "goog.structs.Map", "goog.uri.utils", "goog.uri.utils.ComponentIndex"]);
goog.addDependency("/uri/utils.js", ["goog.uri.utils", "goog.uri.utils.ComponentIndex", "goog.uri.utils.QueryArray", "goog.uri.utils.QueryValue", "goog.uri.utils.StandardQueryParam"], ["goog.asserts", "goog.string", "goog.userAgent"]);
goog.addDependency("/useragent/adobereader.js", ["goog.userAgent.adobeReader"], ["goog.string", "goog.userAgent"]);
goog.addDependency("/useragent/flash.js", ["goog.userAgent.flash"], ["goog.string"]);
goog.addDependency("/useragent/iphoto.js", ["goog.userAgent.iphoto"], ["goog.string", "goog.userAgent"]);
goog.addDependency("/useragent/jscript.js", ["goog.userAgent.jscript"], ["goog.string"]);
goog.addDependency("/useragent/picasa.js", ["goog.userAgent.picasa"], ["goog.string", "goog.userAgent"]);
goog.addDependency("/useragent/platform.js", ["goog.userAgent.platform"], ["goog.userAgent"]);
goog.addDependency("/useragent/product.js", ["goog.userAgent.product"], ["goog.userAgent"]);
goog.addDependency("/useragent/product_isversion.js", ["goog.userAgent.product.isVersion"], ["goog.userAgent.product"]);
goog.addDependency("/useragent/useragent.js", ["goog.userAgent"], ["goog.string"]);
goog.addDependency("/vec/float32array.js", ["goog.vec.Float32Array"], []);
goog.addDependency("/vec/float64array.js", ["goog.vec.Float64Array"], []);
goog.addDependency("/vec/mat3.js", ["goog.vec.Mat3"], ["goog.vec", "goog.vec.Vec3"]);
goog.addDependency("/vec/mat4.js", ["goog.vec.Mat4"], ["goog.vec", "goog.vec.Vec3", "goog.vec.Vec4"]);
goog.addDependency("/vec/matrix3.js", ["goog.vec.Matrix3"], ["goog.vec"]);
goog.addDependency("/vec/matrix4.js", ["goog.vec.Matrix4"], ["goog.vec", "goog.vec.Vec3", "goog.vec.Vec4"]);
goog.addDependency("/vec/quaternion.js", ["goog.vec.Quaternion"], ["goog.vec", "goog.vec.Vec3", "goog.vec.Vec4"]);
goog.addDependency("/vec/ray.js", ["goog.vec.Ray"], ["goog.vec.Vec3"]);
goog.addDependency("/vec/vec.js", ["goog.vec"], ["goog.vec.Float32Array", "goog.vec.Float64Array"]);
goog.addDependency("/vec/vec2.js", ["goog.vec.Vec2"], ["goog.vec"]);
goog.addDependency("/vec/vec3.js", ["goog.vec.Vec3"], ["goog.vec"]);
goog.addDependency("/vec/vec4.js", ["goog.vec.Vec4"], ["goog.vec"]);
goog.addDependency("/webgl/webgl.js", ["goog.webgl"], []);
goog.addDependency("/window/window.js", ["goog.window"], ["goog.string", "goog.userAgent"]);
goog.addDependency("src/start-1.js", ["prezentacja.Start1"], ["goog.dom", "goog.events", "prezentacja.Loader"]);
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Provides a base class for custom Error objects such that the
 * stack is correctly maintained.
 *
 * You should never need to throw goog.debug.Error(msg) directly, Error(msg) is
 * sufficient.
 *
 */

goog.provide('goog.debug.Error');



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
goog.debug.Error = function(opt_msg) {

  // Ensure there is a stack trace.
  this.stack = new Error().stack || '';

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(goog.debug.Error, Error);


/** @override */
goog.debug.Error.prototype.name = 'CustomError';
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for string manipulation.
 */


/**
 * Namespace for string utilities
 */
goog.provide('goog.string');
goog.provide('goog.string.Unicode');


/**
 * Common Unicode string characters.
 * @enum {string}
 */
goog.string.Unicode = {
  NBSP: '\xa0'
};


/**
 * Fast prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix}.
 */
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};


/**
 * Fast suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix}.
 */
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l;
};


/**
 * Case-insensitive prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix  A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(
      prefix, str.substr(0, prefix.length)) == 0;
};


/**
 * Case-insensitive suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(
      suffix, str.substr(str.length - suffix.length, suffix.length)) == 0;
};


/**
 * Does simple python-style string substitution.
 * subs("foo%s hot%s", "bar", "dog") becomes "foobar hotdog".
 * @param {string} str The string containing the pattern.
 * @param {...*} var_args The items to substitute into the pattern.
 * @return {string} A copy of {@code str} in which each occurrence of
 *     {@code %s} has been replaced an argument from {@code var_args}.
 */
goog.string.subs = function(str, var_args) {
  // This appears to be slow, but testing shows it compares more or less
  // equivalent to the regex.exec method.
  for (var i = 1; i < arguments.length; i++) {
    // We cast to String in case an argument is a Function.  Replacing $&, for
    // example, with $$$& stops the replace from subsituting the whole match
    // into the resultant string.  $$$& in the first replace becomes $$& in the
    //  second, which leaves $& in the resultant string.  Also:
    // $$, $`, $', $n $nn
    var replacement = String(arguments[i]).replace(/\$/g, '$$$$');
    str = str.replace(/\%s/, replacement);
  }
  return str;
};


/**
 * Converts multiple whitespace chars (spaces, non-breaking-spaces, new lines
 * and tabs) to a single space, and strips leading and trailing whitespace.
 * @param {string} str Input string.
 * @return {string} A copy of {@code str} with collapsed whitespace.
 */
goog.string.collapseWhitespace = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+/g, ' ').replace(/^\s+|\s+$/g, '');
};


/**
 * Checks if a string is empty or contains only whitespaces.
 * @param {string} str The string to check.
 * @return {boolean} True if {@code str} is empty or whitespace only.
 */
goog.string.isEmpty = function(str) {
  // testing length == 0 first is actually slower in all browsers (about the
  // same in Opera).
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return /^[\s\xa0]*$/.test(str);
};


/**
 * Checks if a string is null, empty or contains only whitespaces.
 * @param {*} str The string to check.
 * @return {boolean} True if{@code str} is null, empty, or whitespace only.
 */
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str));
};


/**
 * Checks if a string is all breaking whitespace.
 * @param {string} str The string to check.
 * @return {boolean} Whether the string is all breaking whitespace.
 */
goog.string.isBreakingWhitespace = function(str) {
  return !/[^\t\n\r ]/.test(str);
};


/**
 * Checks if a string contains all letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} consists entirely of letters.
 */
goog.string.isAlpha = function(str) {
  return !/[^a-zA-Z]/.test(str);
};


/**
 * Checks if a string contains only numbers.
 * @param {*} str string to check. If not a string, it will be
 *     casted to one.
 * @return {boolean} True if {@code str} is numeric.
 */
goog.string.isNumeric = function(str) {
  return !/[^0-9]/.test(str);
};


/**
 * Checks if a string contains only numbers or letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} is alphanumeric.
 */
goog.string.isAlphaNumeric = function(str) {
  return !/[^a-zA-Z0-9]/.test(str);
};


/**
 * Checks if a character is a space character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a space.
 */
goog.string.isSpace = function(ch) {
  return ch == ' ';
};


/**
 * Checks if a character is a valid unicode character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a valid unicode character.
 */
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= ' ' && ch <= '~' ||
         ch >= '\u0080' && ch <= '\uFFFD';
};


/**
 * Takes a string and replaces newlines with a space. Multiple lines are
 * replaced with a single space.
 * @param {string} str The string from which to strip newlines.
 * @return {string} A copy of {@code str} stripped of newlines.
 */
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, ' ');
};


/**
 * Replaces Windows and Mac new lines with unix style: \r or \r\n with \n.
 * @param {string} str The string to in which to canonicalize newlines.
 * @return {string} {@code str} A copy of {@code} with canonicalized newlines.
 */
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, '\n');
};


/**
 * Normalizes whitespace in a string, replacing all whitespace chars with
 * a space.
 * @param {string} str The string in which to normalize whitespace.
 * @return {string} A copy of {@code str} with all whitespace normalized.
 */
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, ' ');
};


/**
 * Normalizes spaces in a string, replacing all consecutive spaces and tabs
 * with a single space. Replaces non-breaking space with a space.
 * @param {string} str The string in which to normalize spaces.
 * @return {string} A copy of {@code str} with all consecutive spaces and tabs
 *    replaced with a single space.
 */
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, ' ');
};


/**
 * Removes the breaking spaces from the left and right of the string and
 * collapses the sequences of breaking spaces in the middle into single spaces.
 * The original and the result strings render the same way in HTML.
 * @param {string} str A string in which to collapse spaces.
 * @return {string} Copy of the string with normalized breaking spaces.
 */
goog.string.collapseBreakingSpaces = function(str) {
  return str.replace(/[\t\r\n ]+/g, ' ').replace(
      /^[\t\r\n ]+|[\t\r\n ]+$/g, '');
};


/**
 * Trims white spaces to the left and right of a string.
 * @param {string} str The string to trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trim = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
};


/**
 * Trims whitespaces at the left end of a string.
 * @param {string} str The string to left trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimLeft = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+/, '');
};


/**
 * Trims whitespaces at the right end of a string.
 * @param {string} str The string to right trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimRight = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+$/, '');
};


/**
 * A string comparator that ignores case.
 * -1 = str1 less than str2
 *  0 = str1 equals str2
 *  1 = str1 greater than str2
 *
 * @param {string} str1 The string to compare.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} The comparator result, as described above.
 */
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();

  if (test1 < test2) {
    return -1;
  } else if (test1 == test2) {
    return 0;
  } else {
    return 1;
  }
};


/**
 * Regular expression used for splitting a string into substrings of fractional
 * numbers, integers, and non-numeric characters.
 * @type {RegExp}
 * @private
 */
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;


/**
 * String comparison function that handles numbers in a way humans might expect.
 * Using this function, the string "File 2.jpg" sorts before "File 10.jpg". The
 * comparison is mostly case-insensitive, though strings that are identical
 * except for case are sorted with the upper-case strings before lower-case.
 *
 * This comparison function is significantly slower (about 500x) than either
 * the default or the case-insensitive compare. It should not be used in
 * time-critical code, but should be fast enough to sort several hundred short
 * strings (like filenames) with a reasonable delay.
 *
 * @param {string} str1 The string to compare in a numerically sensitive way.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} less than 0 if str1 < str2, 0 if str1 == str2, greater than
 *     0 if str1 > str2.
 */
goog.string.numerateCompare = function(str1, str2) {
  if (str1 == str2) {
    return 0;
  }
  if (!str1) {
    return -1;
  }
  if (!str2) {
    return 1;
  }

  // Using match to split the entire string ahead of time turns out to be faster
  // for most inputs than using RegExp.exec or iterating over each character.
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);

  var count = Math.min(tokens1.length, tokens2.length);

  for (var i = 0; i < count; i++) {
    var a = tokens1[i];
    var b = tokens2[i];

    // Compare pairs of tokens, returning if one token sorts before the other.
    if (a != b) {

      // Only if both tokens are integers is a special comparison required.
      // Decimal numbers are sorted as strings (e.g., '.09' < '.1').
      var num1 = parseInt(a, 10);
      if (!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if (!isNaN(num2) && num1 - num2) {
          return num1 - num2;
        }
      }
      return a < b ? -1 : 1;
    }
  }

  // If one string is a substring of the other, the shorter string sorts first.
  if (tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length;
  }

  // The two strings must be equivalent except for case (perfect equality is
  // tested at the head of the function.) Revert to default ASCII-betical string
  // comparison to stablize the sort.
  return str1 < str2 ? -1 : 1;
};


/**
 * Regular expression used for determining if a string needs to be encoded.
 * @type {RegExp}
 * @private
 */
goog.string.encodeUriRegExp_ = /^[a-zA-Z0-9\-_.!~*'()]*$/;


/**
 * URL-encodes a string
 * @param {*} str The string to url-encode.
 * @return {string} An encoded copy of {@code str} that is safe for urls.
 *     Note that '#', ':', and other characters used to delimit portions
 *     of URLs *will* be encoded.
 */
goog.string.urlEncode = function(str) {
  str = String(str);
  // Checking if the search matches before calling encodeURIComponent avoids an
  // extra allocation in IE6. This adds about 10us time in FF and a similiar
  // over head in IE6 for lower working set apps, but for large working set
  // apps like Gmail, it saves about 70us per call.
  if (!goog.string.encodeUriRegExp_.test(str)) {
    return encodeURIComponent(str);
  }
  return str;
};


/**
 * URL-decodes the string. We need to specially handle '+'s because
 * the javascript library doesn't convert them to spaces.
 * @param {string} str The string to url decode.
 * @return {string} The decoded {@code str}.
 */
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, ' '));
};


/**
 * Converts \n to <br>s or <br />s.
 * @param {string} str The string in which to convert newlines.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} A copy of {@code str} with converted newlines.
 */
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? '<br />' : '<br>');
};


/**
 * Escape double quote '"' characters in addition to '&', '<', and '>' so that a
 * string can be included in an HTML tag attribute value within double quotes.
 *
 * It should be noted that > doesn't need to be escaped for the HTML or XML to
 * be valid, but it has been decided to escape it for consistency with other
 * implementations.
 *
 * NOTE(user):
 * HtmlEscape is often called during the generation of large blocks of HTML.
 * Using statics for the regular expressions and strings is an optimization
 * that can more than half the amount of time IE spends in this function for
 * large apps, since strings and regexes both contribute to GC allocations.
 *
 * Testing for the presence of a character before escaping increases the number
 * of function calls, but actually provides a speed increase for the average
 * case -- since the average case often doesn't require the escaping of all 4
 * characters and indexOf() is much cheaper than replace().
 * The worst case does suffer slightly from the additional calls, therefore the
 * opt_isLikelyToContainHtmlChars option has been included for situations
 * where all 4 HTML entities are very likely to be present and need escaping.
 *
 * Some benchmarks (times tended to fluctuate +-0.05ms):
 *                                     FireFox                     IE6
 * (no chars / average (mix of cases) / all 4 chars)
 * no checks                     0.13 / 0.22 / 0.22         0.23 / 0.53 / 0.80
 * indexOf                       0.08 / 0.17 / 0.26         0.22 / 0.54 / 0.84
 * indexOf + re test             0.07 / 0.17 / 0.28         0.19 / 0.50 / 0.85
 *
 * An additional advantage of checking if replace actually needs to be called
 * is a reduction in the number of object allocations, so as the size of the
 * application grows the difference between the various methods would increase.
 *
 * @param {string} str string to be escaped.
 * @param {boolean=} opt_isLikelyToContainHtmlChars Don't perform a check to see
 *     if the character needs replacing - use this option if you expect each of
 *     the characters to appear often. Leave false if you expect few html
 *     characters to occur in your strings, such as if you are escaping HTML.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {

  if (opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, '&amp;')
          .replace(goog.string.ltRe_, '&lt;')
          .replace(goog.string.gtRe_, '&gt;')
          .replace(goog.string.quotRe_, '&quot;');

  } else {
    // quick test helps in the case when there are no chars to replace, in
    // worst case this makes barely a difference to the time taken
    if (!goog.string.allRe_.test(str)) return str;

    // str.indexOf is faster than regex.test in this case
    if (str.indexOf('&') != -1) {
      str = str.replace(goog.string.amperRe_, '&amp;');
    }
    if (str.indexOf('<') != -1) {
      str = str.replace(goog.string.ltRe_, '&lt;');
    }
    if (str.indexOf('>') != -1) {
      str = str.replace(goog.string.gtRe_, '&gt;');
    }
    if (str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, '&quot;');
    }
    return str;
  }
};


/**
 * Regular expression that matches an ampersand, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.amperRe_ = /&/g;


/**
 * Regular expression that matches a less than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.ltRe_ = /</g;


/**
 * Regular expression that matches a greater than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.gtRe_ = />/g;


/**
 * Regular expression that matches a double quote, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.quotRe_ = /\"/g;


/**
 * Regular expression that matches any character that needs to be escaped.
 * @type {RegExp}
 * @private
 */
goog.string.allRe_ = /[&<>\"]/;


/**
 * Unescapes an HTML string.
 *
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapeEntities = function(str) {
  if (goog.string.contains(str, '&')) {
    // We are careful not to use a DOM if we do not have one. We use the []
    // notation so that the JSCompiler will not complain about these objects and
    // fields in the case where we have no DOM.
    if ('document' in goog.global) {
      return goog.string.unescapeEntitiesUsingDom_(str);
    } else {
      // Fall back on pure XML entities
      return goog.string.unescapePureXmlEntities_(str);
    }
  }
  return str;
};


/**
 * Unescapes an HTML string using a DOM to resolve non-XML, non-numeric
 * entities. This function is XSS-safe and whitespace-preserving.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} The unescaped {@code str} string.
 */
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var seen = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"'};
  var div = document.createElement('div');
  // Match as many valid entity characters as possible. If the actual entity
  // happens to be shorter, it will still work as innerHTML will return the
  // trailing characters unchanged. Since the entity characters do not include
  // open angle bracket, there is no chance of XSS from the innerHTML use.
  // Since no whitespace is passed to innerHTML, whitespace is preserved.
  return str.replace(goog.string.HTML_ENTITY_PATTERN_, function(s, entity) {
    // Check for cached entity.
    var value = seen[s];
    if (value) {
      return value;
    }
    // Check for numeric entity.
    if (entity.charAt(0) == '#') {
      // Prefix with 0 so that hex entities (e.g. &#x10) parse as hex numbers.
      var n = Number('0' + entity.substr(1));
      if (!isNaN(n)) {
        value = String.fromCharCode(n);
      }
    }
    // Fall back to innerHTML otherwise.
    if (!value) {
      // Append a non-entity character to avoid a bug in Webkit that parses
      // an invalid entity at the end of innerHTML text as the empty string.
      div.innerHTML = s + ' ';
      // Then remove the trailing character from the result.
      value = div.firstChild.nodeValue.slice(0, -1);
    }
    // Cache and return.
    return seen[s] = value;
  });
};


/**
 * Unescapes XML entities.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch (entity) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      default:
        if (entity.charAt(0) == '#') {
          // Prefix with 0 so that hex entities (e.g. &#x10) parse as hex.
          var n = Number('0' + entity.substr(1));
          if (!isNaN(n)) {
            return String.fromCharCode(n);
          }
        }
        // For invalid entities we just return the entity
        return s;
    }
  });
};


/**
 * Regular expression that matches an HTML entity.
 * See also HTML5: Tokenization / Tokenizing character references.
 * @private
 * @type {!RegExp}
 */
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;


/**
 * Do escaping of whitespace to preserve spatial formatting. We use character
 * entity #160 to make it safer for xml.
 * @param {string} str The string in which to escape whitespace.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, ' &#160;'), opt_xml);
};


/**
 * Strip quote characters around a string.  The second argument is a string of
 * characters to treat as quotes.  This can be a single character or a string of
 * multiple character and in that case each of those are treated as possible
 * quote characters. For example:
 *
 * <pre>
 * goog.string.stripQuotes('"abc"', '"`') --> 'abc'
 * goog.string.stripQuotes('`abc`', '"`') --> 'abc'
 * </pre>
 *
 * @param {string} str The string to strip.
 * @param {string} quoteChars The quote characters to strip.
 * @return {string} A copy of {@code str} without the quotes.
 */
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for (var i = 0; i < length; i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if (str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1);
    }
  }
  return str;
};


/**
 * Truncates a string to a certain length and adds '...' if necessary.  The
 * length also accounts for the ellipsis, so a maximum length of 10 and a string
 * 'Hello World!' produces 'Hello W...'.
 * @param {string} str The string to truncate.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cut off in the middle.
 * @return {string} The truncated {@code str} string.
 */
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (str.length > chars) {
    str = str.substring(0, chars - 3) + '...';
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Truncate a string in the middle, adding "..." if necessary,
 * and favoring the beginning of the string.
 * @param {string} str The string to truncate the middle of.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cutoff in the middle.
 * @param {number=} opt_trailingChars Optional number of trailing characters to
 *     leave at the end of the string, instead of truncating as close to the
 *     middle as possible.
 * @return {string} A truncated copy of {@code str}.
 */
goog.string.truncateMiddle = function(str, chars,
    opt_protectEscapedCharacters, opt_trailingChars) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (opt_trailingChars && str.length > chars) {
    if (opt_trailingChars > chars) {
      opt_trailingChars = chars;
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + '...' + str.substring(endPoint);
  } else if (str.length > chars) {
    // Favor the beginning of the string:
    var half = Math.floor(chars / 2);
    var endPos = str.length - half;
    half += chars % 2;
    str = str.substring(0, half) + '...' + str.substring(endPos);
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Special chars that need to be escaped for goog.string.quote.
 * @private
 * @type {Object}
 */
goog.string.specialEscapeChars_ = {
  '\0': '\\0',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\x0B': '\\x0B', // '\v' is not supported in JScript
  '"': '\\"',
  '\\': '\\\\'
};


/**
 * Character mappings used internally for goog.string.escapeChar.
 * @private
 * @type {Object}
 */
goog.string.jsEscapeCache_ = {
  '\'': '\\\''
};


/**
 * Encloses a string in double quotes and escapes characters so that the
 * string is a valid JS string.
 * @param {string} s The string to quote.
 * @return {string} A copy of {@code s} surrounded by double quotes.
 */
goog.string.quote = function(s) {
  s = String(s);
  if (s.quote) {
    return s.quote();
  } else {
    var sb = ['"'];
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] ||
          ((cc > 31 && cc < 127) ? ch : goog.string.escapeChar(ch));
    }
    sb.push('"');
    return sb.join('');
  }
};


/**
 * Takes a string and returns the escaped string for that character.
 * @param {string} str The string to escape.
 * @return {string} An escaped string representing {@code str}.
 */
goog.string.escapeString = function(str) {
  var sb = [];
  for (var i = 0; i < str.length; i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i));
  }
  return sb.join('');
};


/**
 * Takes a character and returns the escaped string for that character. For
 * example escapeChar(String.fromCharCode(15)) -> "\\x0E".
 * @param {string} c The character to escape.
 * @return {string} An escaped string representing {@code c}.
 */
goog.string.escapeChar = function(c) {
  if (c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c];
  }

  if (c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c];
  }

  var rv = c;
  var cc = c.charCodeAt(0);
  if (cc > 31 && cc < 127) {
    rv = c;
  } else {
    // tab is 9 but handled above
    if (cc < 256) {
      rv = '\\x';
      if (cc < 16 || cc > 256) {
        rv += '0';
      }
    } else {
      rv = '\\u';
      if (cc < 4096) { // \u1000
        rv += '0';
      }
    }
    rv += cc.toString(16).toUpperCase();
  }

  return goog.string.jsEscapeCache_[c] = rv;
};


/**
 * Takes a string and creates a map (Object) in which the keys are the
 * characters in the string. The value for the key is set to true. You can
 * then use goog.object.map or goog.array.map to change the values.
 * @param {string} s The string to build the map from.
 * @return {Object} The map of characters used.
 */
// TODO(arv): It seems like we should have a generic goog.array.toMap. But do
//            we want a dependency on goog.array in goog.string?
goog.string.toMap = function(s) {
  var rv = {};
  for (var i = 0; i < s.length; i++) {
    rv[s.charAt(i)] = true;
  }
  return rv;
};


/**
 * Checks whether a string contains a given character.
 * @param {string} s The string to test.
 * @param {string} ss The substring to test for.
 * @return {boolean} True if {@code s} contains {@code ss}.
 */
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1;
};


/**
 * Returns the non-overlapping occurrences of ss in s.
 * If either s or ss evalutes to false, then returns zero.
 * @param {string} s The string to look in.
 * @param {string} ss The string to look for.
 * @return {number} Number of occurrences of ss in s.
 */
goog.string.countOf = function(s, ss) {
  return s && ss ? s.split(ss).length - 1 : 0;
};


/**
 * Removes a substring of a specified length at a specific
 * index in a string.
 * @param {string} s The base string from which to remove.
 * @param {number} index The index at which to remove the substring.
 * @param {number} stringLength The length of the substring to remove.
 * @return {string} A copy of {@code s} with the substring removed or the full
 *     string if nothing is removed or the input is invalid.
 */
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  // If the index is greater or equal to 0 then remove substring
  if (index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) +
        s.substr(index + stringLength, s.length - index - stringLength);
  }
  return resultStr;
};


/**
 *  Removes the first occurrence of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), '');
  return s.replace(re, '');
};


/**
 *  Removes all occurrences of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), 'g');
  return s.replace(re, '');
};


/**
 * Escapes characters in the string that are not safe to use in a RegExp.
 * @param {*} s The string to escape. If not a string, it will be casted
 *     to one.
 * @return {string} A RegExp safe, escaped copy of {@code s}.
 */
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
      replace(/\x08/g, '\\x08');
};


/**
 * Repeats a string n times.
 * @param {string} string The string to repeat.
 * @param {number} length The number of times to repeat.
 * @return {string} A string containing {@code length} repetitions of
 *     {@code string}.
 */
goog.string.repeat = function(string, length) {
  return new Array(length + 1).join(string);
};


/**
 * Pads number to given length and optionally rounds it to a given precision.
 * For example:
 * <pre>padNumber(1.25, 2, 3) -> '01.250'
 * padNumber(1.25, 2) -> '01.25'
 * padNumber(1.25, 2, 1) -> '01.3'
 * padNumber(1.25, 0) -> '1.25'</pre>
 *
 * @param {number} num The number to pad.
 * @param {number} length The desired length.
 * @param {number=} opt_precision The desired precision.
 * @return {string} {@code num} as a string with the given options.
 */
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf('.');
  if (index == -1) {
    index = s.length;
  }
  return goog.string.repeat('0', Math.max(0, length - index)) + s;
};


/**
 * Returns a string representation of the given object, with
 * null and undefined being returned as the empty string.
 *
 * @param {*} obj The object to convert.
 * @return {string} A string representation of the {@code obj}.
 */
goog.string.makeSafe = function(obj) {
  return obj == null ? '' : String(obj);
};


/**
 * Concatenates string expressions. This is useful
 * since some browsers are very inefficient when it comes to using plus to
 * concat strings. Be careful when using null and undefined here since
 * these will not be included in the result. If you need to represent these
 * be sure to cast the argument to a String first.
 * For example:
 * <pre>buildString('a', 'b', 'c', 'd') -> 'abcd'
 * buildString(null, undefined) -> ''
 * </pre>
 * @param {...*} var_args A list of strings to concatenate. If not a string,
 *     it will be casted to one.
 * @return {string} The concatenation of {@code var_args}.
 */
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, '');
};


/**
 * Returns a string with at least 64-bits of randomness.
 *
 * Doesn't trust Javascript's random function entirely. Uses a combination of
 * random and current timestamp, and then encodes the string in base-36 to
 * make it shorter.
 *
 * @return {string} A random string, e.g. sn1s7vb4gcic.
 */
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) +
         Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36);
};


/**
 * Compares two version numbers.
 *
 * @param {string|number} version1 Version of first item.
 * @param {string|number} version2 Version of second item.
 *
 * @return {number}  1 if {@code version1} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code version2} is higher.
 */
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  // Trim leading and trailing whitespace and split the versions into
  // subversions.
  var v1Subs = goog.string.trim(String(version1)).split('.');
  var v2Subs = goog.string.trim(String(version2)).split('.');
  var subCount = Math.max(v1Subs.length, v2Subs.length);

  // Iterate over the subversions, as long as they appear to be equivalent.
  for (var subIdx = 0; order == 0 && subIdx < subCount; subIdx++) {
    var v1Sub = v1Subs[subIdx] || '';
    var v2Sub = v2Subs[subIdx] || '';

    // Split the subversions into pairs of numbers and qualifiers (like 'b').
    // Two different RegExp objects are needed because they are both using
    // the 'g' flag.
    var v1CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    var v2CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ['', '', ''];
      var v2Comp = v2CompParser.exec(v2Sub) || ['', '', ''];
      // Break if there are no more matches.
      if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break;
      }

      // Parse the numeric part of the subversion. A missing number is
      // equivalent to 0.
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);

      // Compare the subversion components. The number has the highest
      // precedence. Next, if the numbers are equal, a subversion without any
      // qualifier is always higher than a subversion with any qualifier. Next,
      // the qualifiers are compared as strings.
      order = goog.string.compareElements_(v1CompNum, v2CompNum) ||
          goog.string.compareElements_(v1Comp[2].length == 0,
              v2Comp[2].length == 0) ||
          goog.string.compareElements_(v1Comp[2], v2Comp[2]);
      // Stop as soon as an inequality is discovered.
    } while (order == 0);
  }

  return order;
};


/**
 * Compares elements of a version number.
 *
 * @param {string|number|boolean} left An element from a version number.
 * @param {string|number|boolean} right An element from a version number.
 *
 * @return {number}  1 if {@code left} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code right} is higher.
 * @private
 */
goog.string.compareElements_ = function(left, right) {
  if (left < right) {
    return -1;
  } else if (left > right) {
    return 1;
  }
  return 0;
};


/**
 * Maximum value of #goog.string.hashCode, exclusive. 2^32.
 * @type {number}
 * @private
 */
goog.string.HASHCODE_MAX_ = 0x100000000;


/**
 * String hash function similar to java.lang.String.hashCode().
 * The hash code for a string is computed as
 * s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
 * where s[i] is the ith character of the string and n is the length of
 * the string. We mod the result to make it between 0 (inclusive) and 2^32
 * (exclusive).
 * @param {string} str A string.
 * @return {number} Hash value for {@code str}, between 0 (inclusive) and 2^32
 *  (exclusive). The empty string returns 0.
 */
goog.string.hashCode = function(str) {
  var result = 0;
  for (var i = 0; i < str.length; ++i) {
    result = 31 * result + str.charCodeAt(i);
    // Normalize to 4 byte range, 0 ... 2^32.
    result %= goog.string.HASHCODE_MAX_;
  }
  return result;
};


/**
 * The most recent unique ID. |0 is equivalent to Math.floor in this case.
 * @type {number}
 * @private
 */
goog.string.uniqueStringCounter_ = Math.random() * 0x80000000 | 0;


/**
 * Generates and returns a string which is unique in the current document.
 * This is useful, for example, to create unique IDs for DOM elements.
 * @return {string} A unique id.
 */
goog.string.createUniqueString = function() {
  return 'goog_' + goog.string.uniqueStringCounter_++;
};


/**
 * Converts the supplied string to a number, which may be Ininity or NaN.
 * This function strips whitespace: (toNumber(' 123') === 123)
 * This function accepts scientific notation: (toNumber('1e1') === 10)
 *
 * This is better than Javascript's built-in conversions because, sadly:
 *     (Number(' ') === 0) and (parseFloat('123a') === 123)
 *
 * @param {string} str The string to convert.
 * @return {number} The number the supplied string represents, or NaN.
 */
goog.string.toNumber = function(str) {
  var num = Number(str);
  if (num == 0 && goog.string.isEmpty(str)) {
    return NaN;
  }
  return num;
};


/**
 * A memoized cache for goog.string.toCamelCase.
 * @type {Object.<string>}
 * @private
 */
goog.string.toCamelCaseCache_ = {};


/**
 * Converts a string from selector-case to camelCase (e.g. from
 * "multi-part-string" to "multiPartString"), useful for converting
 * CSS selectors and HTML dataset keys to their equivalent JS properties.
 * @param {string} str The string in selector-case form.
 * @return {string} The string in camelCase form.
 */
goog.string.toCamelCase = function(str) {
  return goog.string.toCamelCaseCache_[str] ||
      (goog.string.toCamelCaseCache_[str] =
          String(str).replace(/\-([a-z])/g, function(all, match) {
            return match.toUpperCase();
          }));
};


/**
 * A memoized cache for goog.string.toSelectorCase.
 * @type {Object.<string>}
 * @private
 */
goog.string.toSelectorCaseCache_ = {};


/**
 * Converts a string from camelCase to selector-case (e.g. from
 * "multiPartString" to "multi-part-string"), useful for converting JS
 * style and dataset properties to equivalent CSS selectors and HTML keys.
 * @param {string} str The string in camelCase form.
 * @return {string} The string in selector-case form.
 */
goog.string.toSelectorCase = function(str) {
  return goog.string.toSelectorCaseCache_[str] ||
      (goog.string.toSelectorCaseCache_[str] =
          String(str).replace(/([A-Z])/g, '-$1').toLowerCase());
};
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities to check the preconditions, postconditions and
 * invariants runtime.
 *
 * Methods in this package should be given special treatment by the compiler
 * for type-inference. For example, <code>goog.asserts.assert(foo)</code>
 * will restrict <code>foo</code> to a truthy value.
 *
 * The compiler has an option to disable asserts. So code like:
 * <code>
 * var x = goog.asserts.assert(foo()); goog.asserts.assert(bar());
 * </code>
 * will be transformed into:
 * <code>
 * var x = foo();
 * </code>
 * The compiler will leave in foo() (because its return value is used),
 * but it will remove bar() because it assumes it does not have side-effects.
 *
 */

goog.provide('goog.asserts');
goog.provide('goog.asserts.AssertionError');

goog.require('goog.debug.Error');
goog.require('goog.string');


/**
 * @define {boolean} Whether to strip out asserts or to leave them in.
 */
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;



/**
 * Error object for failed assertions.
 * @param {string} messagePattern The pattern that was used to form message.
 * @param {!Array.<*>} messageArgs The items to substitute into the pattern.
 * @constructor
 * @extends {goog.debug.Error}
 */
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  // Remove the messagePattern afterwards to avoid permenantly modifying the
  // passed in array.
  messageArgs.shift();

  /**
   * The message pattern used to format the error message. Error handlers can
   * use this to uniquely identify the assertion.
   * @type {string}
   */
  this.messagePattern = messagePattern;
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);


/** @override */
goog.asserts.AssertionError.prototype.name = 'AssertionError';


/**
 * Throws an exception with the given message and "Assertion failed" prefixed
 * onto it.
 * @param {string} defaultMessage The message to use if givenMessage is empty.
 * @param {Array.<*>} defaultArgs The substitution arguments for defaultMessage.
 * @param {string|undefined} givenMessage Message supplied by the caller.
 * @param {Array.<*>} givenArgs The substitution arguments for givenMessage.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 * @private
 */
goog.asserts.doAssertFailure_ =
    function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = 'Assertion failed';
  if (givenMessage) {
    message += ': ' + givenMessage;
    var args = givenArgs;
  } else if (defaultMessage) {
    message += ': ' + defaultMessage;
    args = defaultArgs;
  }
  // The '' + works around an Opera 10 bug in the unit tests. Without it,
  // a stack trace is added to var message above. With this, a stack trace is
  // not added until this line (it causes the extra garbage to be added after
  // the assertion message instead of in the middle of it).
  throw new goog.asserts.AssertionError('' + message, args || []);
};


/**
 * Checks if the condition evaluates to true if goog.asserts.ENABLE_ASSERTS is
 * true.
 * @param {*} condition The condition to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {*} The value of the condition.
 * @throws {goog.asserts.AssertionError} When the condition evaluates to false.
 */
goog.asserts.assert = function(condition, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_('', null, opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return condition;
};


/**
 * Fails if goog.asserts.ENABLE_ASSERTS is true. This function is useful in case
 * when we want to add a check in the unreachable area like switch-case
 * statement:
 *
 * <pre>
 *  switch(type) {
 *    case FOO: doSomething(); break;
 *    case BAR: doSomethingElse(); break;
 *    default: goog.assert.fail('Unrecognized type: ' + type);
 *      // We have only 2 types - "default:" section is unreachable code.
 *  }
 * </pre>
 *
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} Failure.
 */
goog.asserts.fail = function(opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS) {
    throw new goog.asserts.AssertionError(
        'Failure' + (opt_message ? ': ' + opt_message : ''),
        Array.prototype.slice.call(arguments, 1));
  }
};


/**
 * Checks if the value is a number if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {number} The value, guaranteed to be a number when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 */
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_('Expected number but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {number} */ (value);
};


/**
 * Checks if the value is a string if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {string} The value, guaranteed to be a string when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a string.
 */
goog.asserts.assertString = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_('Expected string but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {string} */ (value);
};


/**
 * Checks if the value is a function if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Function} The value, guaranteed to be a function when asserts
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a function.
 */
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_('Expected function but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Function} */ (value);
};


/**
 * Checks if the value is an Object if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Object} The value, guaranteed to be a non-null object.
 * @throws {goog.asserts.AssertionError} When the value is not an object.
 */
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_('Expected object but got %s: %s.',
        [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Object} */ (value);
};


/**
 * Checks if the value is an Array if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Array} The value, guaranteed to be a non-null array.
 * @throws {goog.asserts.AssertionError} When the value is not an array.
 */
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_('Expected array but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Array} */ (value);
};


/**
 * Checks if the value is a boolean if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {boolean} The value, guaranteed to be a boolean when asserts are
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a boolean.
 */
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_('Expected boolean but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {boolean} */ (value);
};


/**
 * Checks if the value is an instance of the user-defined type if
 * goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {!Function} type A user-defined constructor.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} When the value is not an instance of
 *     type.
 */
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_('instanceof check failed.', null,
        opt_message, Array.prototype.slice.call(arguments, 3));
  }
};

// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for manipulating arrays.
 *
 */


goog.provide('goog.array');
goog.provide('goog.array.ArrayLike');

goog.require('goog.asserts');


/**
 * @define {boolean} NATIVE_ARRAY_PROTOTYPES indicates whether the code should
 * rely on Array.prototype functions, if available.
 *
 * The Array.prototype functions can be defined by external libraries like
 * Prototype and setting this flag to false forces closure to use its own
 * goog.array implementation.
 *
 * If your javascript can be loaded by a third party site and you are wary about
 * relying on the prototype functions, specify
 * "--define goog.NATIVE_ARRAY_PROTOTYPES=false" to the JSCompiler.
 */
goog.NATIVE_ARRAY_PROTOTYPES = true;


/**
 * @typedef {Array|NodeList|Arguments|{length: number}}
 */
goog.array.ArrayLike;


/**
 * Returns the last element in an array without removing it.
 * @param {goog.array.ArrayLike} array The array.
 * @return {*} Last item in array.
 */
goog.array.peek = function(array) {
  return array[array.length - 1];
};


/**
 * Reference to the original {@code Array.prototype}.
 * @private
 */
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;


// NOTE(arv): Since most of the array functions are generic it allows you to
// pass an array-like object. Strings have a length and are considered array-
// like. However, the 'in' operator does not work on strings so we cannot just
// use the array path even if the browser supports indexing into strings. We
// therefore end up splitting the string.


/**
 * Returns the index of the first element of an array with a specified
 * value, or -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-indexof}
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} obj The object for which we are searching.
 * @param {number=} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at index 0.
 * @return {number} The index of the first matching array element.
 */
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES &&
                     goog.array.ARRAY_PROTOTYPE_.indexOf ?
    function(arr, obj, opt_fromIndex) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = opt_fromIndex == null ?
          0 : (opt_fromIndex < 0 ?
               Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex);

      if (goog.isString(arr)) {
        // Array.prototype.indexOf uses === so only strings should be found.
        if (!goog.isString(obj) || obj.length != 1) {
          return -1;
        }
        return arr.indexOf(obj, fromIndex);
      }

      for (var i = fromIndex; i < arr.length; i++) {
        if (i in arr && arr[i] === obj)
          return i;
      }
      return -1;
    };


/**
 * Returns the index of the last element of an array with a specified value, or
 * -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-lastindexof}
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} obj The object for which we are searching.
 * @param {?number=} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at the end of the array.
 * @return {number} The index of the last matching array element.
 */
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES &&
                         goog.array.ARRAY_PROTOTYPE_.lastIndexOf ?
    function(arr, obj, opt_fromIndex) {
      goog.asserts.assert(arr.length != null);

      // Firefox treats undefined and null as 0 in the fromIndex argument which
      // leads it to always return -1
      var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
      return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;

      if (fromIndex < 0) {
        fromIndex = Math.max(0, arr.length + fromIndex);
      }

      if (goog.isString(arr)) {
        // Array.prototype.lastIndexOf uses === so only strings should be found.
        if (!goog.isString(obj) || obj.length != 1) {
          return -1;
        }
        return arr.lastIndexOf(obj, fromIndex);
      }

      for (var i = fromIndex; i >= 0; i--) {
        if (i in arr && arr[i] === obj)
          return i;
      }
      return -1;
    };


/**
 * Calls a function for each element in an array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-foreach}
 *
 * @param {goog.array.ArrayLike} arr Array or array like object over
 *     which to iterate.
 * @param {?function(this: T, ...)} f The function to call for every element.
 *     This function takes 3 arguments (the element, the index and the array).
 *     The return value is ignored. The function is called only for indexes of
 *     the array which have assigned values; it is not called for indexes which
 *     have been deleted or which have never been assigned values.
 * @param {T=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @template T
 */
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES &&
                     goog.array.ARRAY_PROTOTYPE_.forEach ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          f.call(opt_obj, arr2[i], i, arr);
        }
      }
    };


/**
 * Calls a function for each element in an array, starting from the last
 * element rather than the first.
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array). The return
 *     value is ignored.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 */
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; --i) {
    if (i in arr2) {
      f.call(opt_obj, arr2[i], i, arr);
    }
  }
};


/**
 * Calls a function for each element in an array, and if the function returns
 * true adds the element to a new array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-filter}
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean. If the return value is true the element is added to the
 *     result array. If it is false the element is not included.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {!Array} a new array in which only elements that passed the test are
 *     present.
 */
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES &&
                    goog.array.ARRAY_PROTOTYPE_.filter ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = [];
      var resLength = 0;
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          var val = arr2[i];  // in case f mutates arr2
          if (f.call(opt_obj, val, i, arr)) {
            res[resLength++] = val;
          }
        }
      }
      return res;
    };


/**
 * Calls a function for each element in an array and inserts the result into a
 * new array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-map}
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return something. The result will be inserted into a new array.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {!Array} a new array with the results from f.
 */
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES &&
                 goog.array.ARRAY_PROTOTYPE_.map ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = new Array(l);
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          res[i] = f.call(opt_obj, arr2[i], i, arr);
        }
      }
      return res;
    };


/**
 * Passes every element of an array into a function and accumulates the result.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-reduce}
 *
 * For example:
 * var a = [1, 2, 3, 4];
 * goog.array.reduce(a, function(r, v, i, arr) {return r + v;}, 0);
 * returns 10
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {*} Result of evaluating f repeatedly across the values of the array.
 */
goog.array.reduce = function(arr, f, val, opt_obj) {
  if (arr.reduce) {
    if (opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduce(f, val);
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};


/**
 * Passes every element of an array into a function and accumulates the result,
 * starting from the last element and working towards the first.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-reduceright}
 *
 * For example:
 * var a = ['a', 'b', 'c'];
 * goog.array.reduceRight(a, function(r, v, i, arr) {return r + v;}, '');
 * returns 'cba'
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {*} Object returned as a result of evaluating f repeatedly across the
 *     values of the array.
 */
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if (arr.reduceRight) {
    if (opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduceRight(f, val);
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};


/**
 * Calls f for each element of an array. If any call returns true, some()
 * returns true (without checking the remaining elements). If all calls
 * return false, some() returns false.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-some}
 *
 * @param {goog.array.ArrayLike} arr The array to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} true if any element passes the test.
 */
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES &&
                  goog.array.ARRAY_PROTOTYPE_.some ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
          return true;
        }
      }
      return false;
    };


/**
 * Call f for each element of an array. If all calls return true, every()
 * returns true. If any call returns false, every() returns false and
 * does not continue to check the remaining elements.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-every}
 *
 * @param {goog.array.ArrayLike} arr The array to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} false if any element fails the test.
 */
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES &&
                   goog.array.ARRAY_PROTOTYPE_.every ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
          return false;
        }
      }
      return true;
    };


/**
 * Search an array for the first element that satisfies a given condition and
 * return that element.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {*} The first array element that passes the test, or null if no
 *     element is found.
 */
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array for the first element that satisfies a given condition and
 * return its index.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {number} The index of the first array element that passes the test,
 *     or -1 if no element is found.
 */
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return that element.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {*} The last array element that passes the test, or null if no
 *     element is found.
 */
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return its index.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {number} The index of the last array element that passes the test,
 *     or -1 if no element is found.
 */
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; i--) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Whether the array contains the given object.
 * @param {goog.array.ArrayLike} arr The array to test for the presence of the
 *     element.
 * @param {*} obj The object for which to test.
 * @return {boolean} true if obj is present.
 */
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0;
};


/**
 * Whether the array is empty.
 * @param {goog.array.ArrayLike} arr The array to test.
 * @return {boolean} true if empty.
 */
goog.array.isEmpty = function(arr) {
  return arr.length == 0;
};


/**
 * Clears the array.
 * @param {goog.array.ArrayLike} arr Array or array like object to clear.
 */
goog.array.clear = function(arr) {
  // For non real arrays we don't have the magic length so we delete the
  // indices.
  if (!goog.isArray(arr)) {
    for (var i = arr.length - 1; i >= 0; i--) {
      delete arr[i];
    }
  }
  arr.length = 0;
};


/**
 * Pushes an item into an array, if it's not already in the array.
 * @param {Array} arr Array into which to insert the item.
 * @param {*} obj Value to add.
 */
goog.array.insert = function(arr, obj) {
  if (!goog.array.contains(arr, obj)) {
    arr.push(obj);
  }
};


/**
 * Inserts an object at the given index of the array.
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {number=} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj);
};


/**
 * Inserts at the given index of the array, all elements of another array.
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {goog.array.ArrayLike} elementsToAdd The array of elements to add.
 * @param {number=} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd);
};


/**
 * Inserts an object into an array before a specified object.
 * @param {Array} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {*=} opt_obj2 The object before which obj should be inserted. If obj2
 *     is omitted or not found, obj is inserted at the end of the array.
 */
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if (arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj);
  } else {
    goog.array.insertAt(arr, obj, i);
  }
};


/**
 * Removes the first occurrence of a particular value from an array.
 * @param {goog.array.ArrayLike} arr Array from which to remove value.
 * @param {*} obj Object to remove.
 * @return {boolean} True if an element was removed.
 */
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if ((rv = i >= 0)) {
    goog.array.removeAt(arr, i);
  }
  return rv;
};


/**
 * Removes from an array the element at index i
 * @param {goog.array.ArrayLike} arr Array or array like object from which to
 *     remove value.
 * @param {number} i The index to remove.
 * @return {boolean} True if an element was removed.
 */
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);

  // use generic form of splice
  // splice returns the removed items and if successful the length of that
  // will be 1
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1;
};


/**
 * Removes the first value that satisfies the given condition.
 * @param {goog.array.ArrayLike} arr Array from which to remove value.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {boolean} True if an element was removed.
 */
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if (i >= 0) {
    goog.array.removeAt(arr, i);
    return true;
  }
  return false;
};


/**
 * Returns a new array that is the result of joining the arguments.  If arrays
 * are passed then their items are added, however, if non-arrays are passed they
 * will be added to the return array as is.
 *
 * Note that ArrayLike objects will be added as is, rather than having their
 * items added.
 *
 * goog.array.concat([1, 2], [3, 4]) -> [1, 2, 3, 4]
 * goog.array.concat(0, [1, 2]) -> [0, 1, 2]
 * goog.array.concat([1, 2], null) -> [1, 2, null]
 *
 * There is bug in all current versions of IE (6, 7 and 8) where arrays created
 * in an iframe become corrupted soon (not immediately) after the iframe is
 * destroyed. This is common if loading data via goog.net.IframeIo, for example.
 * This corruption only affects the concat method which will start throwing
 * Catastrophic Errors (#-2147418113).
 *
 * See http://endoflow.com/scratch/corrupted-arrays.html for a test case.
 *
 * Internally goog.array should use this, so that all methods will continue to
 * work on these broken array objects.
 *
 * @param {...*} var_args Items to concatenate.  Arrays will have each item
 *     added, while primitives and objects will be added as is.
 * @return {!Array} The new resultant array.
 */
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(
      goog.array.ARRAY_PROTOTYPE_, arguments);
};


/**
 * Does a shallow copy of an array.
 * @param {goog.array.ArrayLike} arr  Array or array-like object to clone.
 * @return {!Array} Clone of the input array.
 */
goog.array.clone = function(arr) {
  if (goog.isArray(arr)) {
    return goog.array.concat(/** @type {!Array} */ (arr));
  } else { // array like
    // Concat does not work with non arrays.
    var rv = [];
    for (var i = 0, len = arr.length; i < len; i++) {
      rv[i] = arr[i];
    }
    return rv;
  }
};


/**
 * Converts an object to an array.
 * @param {goog.array.ArrayLike} object  The object to convert to an array.
 * @return {!Array} The object converted into an array. If object has a
 *     length property, every property indexed with a non-negative number
 *     less than length will be included in the result. If object does not
 *     have a length property, an empty array will be returned.
 */
goog.array.toArray = function(object) {
  if (goog.isArray(object)) {
    // This fixes the JS compiler warning and forces the Object to an Array type
    return goog.array.concat(/** @type {!Array} */ (object));
  }
  // Clone what we hope to be an array-like object to an array.
  // We could check isArrayLike() first, but no check we perform would be as
  // reliable as simply making the call.
  return goog.array.clone(/** @type {Array} */ (object));
};


/**
 * Extends an array with another array, element, or "array like" object.
 * This function operates 'in-place', it does not create a new Array.
 *
 * Example:
 * var a = [];
 * goog.array.extend(a, [0, 1]);
 * a; // [0, 1]
 * goog.array.extend(a, 2);
 * a; // [0, 1, 2]
 *
 * @param {Array} arr1  The array to modify.
 * @param {...*} var_args The elements or arrays of elements to add to arr1.
 */
goog.array.extend = function(arr1, var_args) {
  for (var i = 1; i < arguments.length; i++) {
    var arr2 = arguments[i];
    // If we have an Array or an Arguments object we can just call push
    // directly.
    var isArrayLike;
    if (goog.isArray(arr2) ||
        // Detect Arguments. ES5 says that the [[Class]] of an Arguments object
        // is "Arguments" but only V8 and JSC/Safari gets this right. We instead
        // detect Arguments by checking for array like and presence of "callee".
        (isArrayLike = goog.isArrayLike(arr2)) &&
            // The getter for callee throws an exception in strict mode
            // according to section 10.6 in ES5 so check for presence instead.
            arr2.hasOwnProperty('callee')) {
      arr1.push.apply(arr1, arr2);

    } else if (isArrayLike) {
      // Otherwise loop over arr2 to prevent copying the object.
      var len1 = arr1.length;
      var len2 = arr2.length;
      for (var j = 0; j < len2; j++) {
        arr1[len1 + j] = arr2[j];
      }
    } else {
      arr1.push(arr2);
    }
  }
};


/**
 * Adds or removes elements from an array. This is a generic version of Array
 * splice. This means that it might work on other objects similar to arrays,
 * such as the arguments object.
 *
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {number|undefined} index The index at which to start changing the
 *     array. If not defined, treated as 0.
 * @param {number} howMany How many elements to remove (0 means no removal. A
 *     value below 0 is treated as zero and so is any other non number. Numbers
 *     are floored).
 * @param {...*} var_args Optional, additional elements to insert into the
 *     array.
 * @return {!Array} the removed elements.
 */
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);

  return goog.array.ARRAY_PROTOTYPE_.splice.apply(
      arr, goog.array.slice(arguments, 1));
};


/**
 * Returns a new array from a segment of an array. This is a generic version of
 * Array slice. This means that it might work on other objects similar to
 * arrays, such as the arguments object.
 *
 * @param {goog.array.ArrayLike} arr The array from which to copy a segment.
 * @param {number} start The index of the first element to copy.
 * @param {number=} opt_end The index after the last element to copy.
 * @return {!Array} A new array containing the specified segment of the original
 *     array.
 */
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);

  // passing 1 arg to slice is not the same as passing 2 where the second is
  // null or undefined (in that case the second argument is treated as 0).
  // we could use slice on the arguments object and then use apply instead of
  // testing the length
  if (arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start);
  } else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end);
  }
};


/**
 * Removes all duplicates from an array (retaining only the first
 * occurrence of each array element).  This function modifies the
 * array in place and doesn't change the order of the non-duplicate items.
 *
 * For objects, duplicates are identified as having the same unique ID as
 * defined by {@link goog.getUid}.
 *
 * Runtime: N,
 * Worstcase space: 2N (no dupes)
 *
 * @param {goog.array.ArrayLike} arr The array from which to remove duplicates.
 * @param {Array=} opt_rv An optional array in which to return the results,
 *     instead of performing the removal inplace.  If specified, the original
 *     array will remain unchanged.
 */
goog.array.removeDuplicates = function(arr, opt_rv) {
  var returnArray = opt_rv || arr;

  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while (cursorRead < arr.length) {
    var current = arr[cursorRead++];

    // Prefix each type with a single character representing the type to
    // prevent conflicting keys (e.g. true and 'true').
    var key = goog.isObject(current) ?
        'o' + goog.getUid(current) :
        (typeof current).charAt(0) + current;

    if (!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current;
    }
  }
  returnArray.length = cursorInsert;
};


/**
 * Searches the specified array for the specified target using the binary
 * search algorithm.  If no opt_compareFn is specified, elements are compared
 * using <code>goog.array.defaultCompare</code>, which compares the elements
 * using the built in < and > operators.  This will produce the expected
 * behavior for homogeneous arrays of String(s) and Number(s). The array
 * specified <b>must</b> be sorted in ascending order (as defined by the
 * comparison function).  If the array is not sorted, results are undefined.
 * If the array contains multiple instances of the specified target value, any
 * of these instances may be found.
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} target The sought value.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 */
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr,
      opt_compareFn || goog.array.defaultCompare, false /* isEvaluator */,
      target);
};


/**
 * Selects an index in the specified array using the binary search algorithm.
 * The evaluator receives an element and determines whether the desired index
 * is before, at, or after it.  The evaluator must be consistent (formally,
 * goog.array.map(goog.array.map(arr, evaluator, opt_obj), goog.math.sign)
 * must be monotonically non-increasing).
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {Function} evaluator Evaluator function that receives 3 arguments
 *     (the element, the index and the array). Should return a negative number,
 *     zero, or a positive number depending on whether the desired index is
 *     before, at, or after the element passed to it.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within evaluator.
 * @return {number} Index of the leftmost element matched by the evaluator, if
 *     such exists; otherwise (-(insertion point) - 1). The insertion point is
 *     the index of the first element for which the evaluator returns negative,
 *     or arr.length if no such element exists. The return value is non-negative
 *     iff a match is found.
 */
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true /* isEvaluator */,
      undefined /* opt_target */, opt_obj);
};


/**
 * Implementation of a binary search algorithm which knows how to use both
 * comparison functions and evaluators. If an evaluator is provided, will call
 * the evaluator with the given optional data object, conforming to the
 * interface defined in binarySelect. Otherwise, if a comparison function is
 * provided, will call the comparison function against the given data object.
 *
 * This implementation purposefully does not use goog.bind or goog.partial for
 * performance reasons.
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {Function} compareFn Either an evaluator or a comparison function,
 *     as defined by binarySearch and binarySelect above.
 * @param {boolean} isEvaluator Whether the function is an evaluator or a
 *     comparison function.
 * @param {*=} opt_target If the function is a comparison function, then this is
 *     the target to binary search for.
 * @param {Object=} opt_selfObj If the function is an evaluator, this is an
  *    optional this object for the evaluator.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 * @private
 */
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target,
    opt_selfObj) {
  var left = 0;  // inclusive
  var right = arr.length;  // exclusive
  var found;
  while (left < right) {
    var middle = (left + right) >> 1;
    var compareResult;
    if (isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr);
    } else {
      compareResult = compareFn(opt_target, arr[middle]);
    }
    if (compareResult > 0) {
      left = middle + 1;
    } else {
      right = middle;
      // We are looking for the lowest index so we can't return immediately.
      found = !compareResult;
    }
  }
  // left is the index if found, or the insertion point otherwise.
  // ~left is a shorthand for -left - 1.
  return found ? left : ~left;
};


/**
 * Sorts the specified array into ascending order.  If no opt_compareFn is
 * specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s), unlike the native sort,
 * but will give unpredictable results for heterogenous lists of strings and
 * numbers with different numbers of digits.
 *
 * This sort is not guaranteed to be stable.
 *
 * Runtime: Same as <code>Array.prototype.sort</code>
 *
 * @param {Array} arr The array to be sorted.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is to be ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 */
goog.array.sort = function(arr, opt_compareFn) {
  // TODO(arv): Update type annotation since null is not accepted.
  goog.asserts.assert(arr.length != null);

  goog.array.ARRAY_PROTOTYPE_.sort.call(
      arr, opt_compareFn || goog.array.defaultCompare);
};


/**
 * Sorts the specified array into ascending order in a stable way.  If no
 * opt_compareFn is specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s).
 *
 * Runtime: Same as <code>Array.prototype.sort</code>, plus an additional
 * O(n) overhead of copying the array twice.
 *
 * @param {Array} arr The array to be sorted.
 * @param {function(*, *): number=} opt_compareFn Optional comparison function
 *     by which the array is to be ordered. Should take 2 arguments to compare,
 *     and return a negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 */
goog.array.stableSort = function(arr, opt_compareFn) {
  for (var i = 0; i < arr.length; i++) {
    arr[i] = {index: i, value: arr[i]};
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index;
  };
  goog.array.sort(arr, stableCompareFn);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i].value;
  }
};


/**
 * Sorts an array of objects by the specified object key and compare
 * function. If no compare function is provided, the key values are
 * compared in ascending order using <code>goog.array.defaultCompare</code>.
 * This won't work for keys that get renamed by the compiler. So use
 * {'foo': 1, 'bar': 2} rather than {foo: 1, bar: 2}.
 * @param {Array.<Object>} arr An array of objects to sort.
 * @param {string} key The object key to sort by.
 * @param {Function=} opt_compareFn The function to use to compare key
 *     values.
 */
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key]);
  });
};


/**
 * Tells if the array is sorted.
 * @param {!Array} arr The array.
 * @param {Function=} opt_compareFn Function to compare the array elements.
 *     Should take 2 arguments to compare, and return a negative number, zero,
 *     or a positive number depending on whether the first argument is less
 *     than, equal to, or greater than the second.
 * @param {boolean=} opt_strict If true no equal elements are allowed.
 * @return {boolean} Whether the array is sorted.
 */
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for (var i = 1; i < arr.length; i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if (compareResult > 0 || compareResult == 0 && opt_strict) {
      return false;
    }
  }
  return true;
};


/**
 * Compares two arrays for equality. Two arrays are considered equal if they
 * have the same length and their corresponding elements are equal according to
 * the comparison function.
 *
 * @param {goog.array.ArrayLike} arr1 The first array to compare.
 * @param {goog.array.ArrayLike} arr2 The second array to compare.
 * @param {Function=} opt_equalsFn Optional comparison function.
 *     Should take 2 arguments to compare, and return true if the arguments
 *     are equal. Defaults to {@link goog.array.defaultCompareEquality} which
 *     compares the elements using the built-in '===' operator.
 * @return {boolean} Whether the two arrays are equal.
 */
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if (!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) ||
      arr1.length != arr2.length) {
    return false;
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for (var i = 0; i < l; i++) {
    if (!equalsFn(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
};


/**
 * @deprecated Use {@link goog.array.equals}.
 * @param {goog.array.ArrayLike} arr1 See {@link goog.array.equals}.
 * @param {goog.array.ArrayLike} arr2 See {@link goog.array.equals}.
 * @param {Function=} opt_equalsFn See {@link goog.array.equals}.
 * @return {boolean} See {@link goog.array.equals}.
 */
goog.array.compare = function(arr1, arr2, opt_equalsFn) {
  return goog.array.equals(arr1, arr2, opt_equalsFn);
};


/**
 * 3-way array compare function.
 * @param {!goog.array.ArrayLike} arr1 The first array to compare.
 * @param {!goog.array.ArrayLike} arr2 The second array to compare.
 * @param {(function(*, *): number)=} opt_compareFn Optional comparison function
 *     by which the array is to be ordered. Should take 2 arguments to compare,
 *     and return a negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 * @return {number} Negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 */
goog.array.compare3 = function(arr1, arr2, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  var l = Math.min(arr1.length, arr2.length);
  for (var i = 0; i < l; i++) {
    var result = compare(arr1[i], arr2[i]);
    if (result != 0) {
      return result;
    }
  }
  return goog.array.defaultCompare(arr1.length, arr2.length);
};


/**
 * Compares its two arguments for order, using the built in < and >
 * operators.
 * @param {*} a The first object to be compared.
 * @param {*} b The second object to be compared.
 * @return {number} A negative number, zero, or a positive number as the first
 *     argument is less than, equal to, or greater than the second.
 */
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};


/**
 * Compares its two arguments for equality, using the built in === operator.
 * @param {*} a The first object to compare.
 * @param {*} b The second object to compare.
 * @return {boolean} True if the two arguments are equal, false otherwise.
 */
goog.array.defaultCompareEquality = function(a, b) {
  return a === b;
};


/**
 * Inserts a value into a sorted array. The array is not modified if the
 * value is already present.
 * @param {Array} array The array to modify.
 * @param {*} value The object to insert.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {boolean} True if an element was inserted.
 */
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if (index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true;
  }
  return false;
};


/**
 * Removes a value from a sorted array.
 * @param {Array} array The array to modify.
 * @param {*} value The object to remove.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {boolean} True if an element was removed.
 */
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return (index >= 0) ? goog.array.removeAt(array, index) : false;
};


/**
 * Splits an array into disjoint buckets according to a splitting function.
 * @param {Array} array The array.
 * @param {Function} sorter Function to call for every element.  This
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a valid object key (a string, number, etc), or undefined, if
 *     that object should not be placed in a bucket.
 * @return {!Object} An object, with keys being all of the unique return values
 *     of sorter, and values being arrays containing the items for
 *     which the splitter returned that key.
 */
goog.array.bucket = function(array, sorter) {
  var buckets = {};

  for (var i = 0; i < array.length; i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if (goog.isDef(key)) {
      // Push the value to the right bucket, creating it if necessary.
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value);
    }
  }

  return buckets;
};


/**
 * Returns an array consisting of the given value repeated N times.
 *
 * @param {*} value The value to repeat.
 * @param {number} n The repeat count.
 * @return {!Array.<*>} An array with the repeated value.
 */
goog.array.repeat = function(value, n) {
  var array = [];
  for (var i = 0; i < n; i++) {
    array[i] = value;
  }
  return array;
};


/**
 * Returns an array consisting of every argument with all arrays
 * expanded in-place recursively.
 *
 * @param {...*} var_args The values to flatten.
 * @return {!Array.<*>} An array containing the flattened values.
 */
goog.array.flatten = function(var_args) {
  var result = [];
  for (var i = 0; i < arguments.length; i++) {
    var element = arguments[i];
    if (goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element));
    } else {
      result.push(element);
    }
  }
  return result;
};


/**
 * Rotates an array in-place. After calling this method, the element at
 * index i will be the element previously at index (i - n) %
 * array.length, for all values of i between 0 and array.length - 1,
 * inclusive.
 *
 * For example, suppose list comprises [t, a, n, k, s]. After invoking
 * rotate(array, 1) (or rotate(array, -4)), array will comprise [s, t, a, n, k].
 *
 * @param {!Array.<*>} array The array to rotate.
 * @param {number} n The amount to rotate.
 * @return {!Array.<*>} The array.
 */
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);

  if (array.length) {
    n %= array.length;
    if (n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n));
    } else if (n < 0) {
      goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n));
    }
  }
  return array;
};


/**
 * Creates a new array for which the element at position i is an array of the
 * ith element of the provided arrays.  The returned array will only be as long
 * as the shortest array provided; additional values are ignored.  For example,
 * the result of zipping [1, 2] and [3, 4, 5] is [[1,3], [2, 4]].
 *
 * This is similar to the zip() function in Python.  See {@link
 * http://docs.python.org/library/functions.html#zip}
 *
 * @param {...!goog.array.ArrayLike} var_args Arrays to be combined.
 * @return {!Array.<!Array>} A new array of arrays created from provided arrays.
 */
goog.array.zip = function(var_args) {
  if (!arguments.length) {
    return [];
  }
  var result = [];
  for (var i = 0; true; i++) {
    var value = [];
    for (var j = 0; j < arguments.length; j++) {
      var arr = arguments[j];
      // If i is larger than the array length, this is the shortest array.
      if (i >= arr.length) {
        return result;
      }
      value.push(arr[i]);
    }
    result.push(value);
  }
};


/**
 * Shuffles the values in the specified array using the Fisher-Yates in-place
 * shuffle (also known as the Knuth Shuffle). By default, calls Math.random()
 * and so resets the state of that random number generator. Similarly, may reset
 * the state of the any other specified random number generator.
 *
 * Runtime: O(n)
 *
 * @param {!Array} arr The array to be shuffled.
 * @param {Function=} opt_randFn Optional random function to use for shuffling.
 *     Takes no arguments, and returns a random number on the interval [0, 1).
 *     Defaults to Math.random() using JavaScript's built-in Math library.
 */
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;

  for (var i = arr.length - 1; i > 0; i--) {
    // Choose a random array index in [0, i] (inclusive with i).
    var j = Math.floor(randFn() * (i + 1));

    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Rendering engine detection.
 * @see <a href="http://www.useragentstring.com/">User agent strings</a>
 * For information on the browser brand (such as Safari versus Chrome), see
 * goog.userAgent.product.
 * @see ../demos/useragent.html
 */

goog.provide('goog.userAgent');

goog.require('goog.string');


/**
 * @define {boolean} Whether we know at compile-time that the browser is IE.
 */
goog.userAgent.ASSUME_IE = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is GECKO.
 */
goog.userAgent.ASSUME_GECKO = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is WEBKIT.
 */
goog.userAgent.ASSUME_WEBKIT = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is a
 *     mobile device running WebKit e.g. iPhone or Android.
 */
goog.userAgent.ASSUME_MOBILE_WEBKIT = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is OPERA.
 */
goog.userAgent.ASSUME_OPERA = false;


/**
 * @define {boolean} Whether the {@code goog.userAgent.isVersion} function will
 *     return true for any version.
 */
goog.userAgent.ASSUME_ANY_VERSION = false;


/**
 * Whether we know the browser engine at compile-time.
 * @type {boolean}
 * @private
 */
goog.userAgent.BROWSER_KNOWN_ =
    goog.userAgent.ASSUME_IE ||
    goog.userAgent.ASSUME_GECKO ||
    goog.userAgent.ASSUME_MOBILE_WEBKIT ||
    goog.userAgent.ASSUME_WEBKIT ||
    goog.userAgent.ASSUME_OPERA;


/**
 * Returns the userAgent string for the current browser.
 * Some user agents (I'm thinking of you, Gears WorkerPool) do not expose a
 * navigator object off the global scope.  In that case we return null.
 *
 * @return {?string} The userAgent string or null if there is none.
 */
goog.userAgent.getUserAgentString = function() {
  return goog.global['navigator'] ? goog.global['navigator'].userAgent : null;
};


/**
 * @return {Object} The native navigator object.
 */
goog.userAgent.getNavigator = function() {
  // Need a local navigator reference instead of using the global one,
  // to avoid the rare case where they reference different objects.
  // (goog.gears.FakeWorkerPool, for example).
  return goog.global['navigator'];
};


/**
 * Initializer for goog.userAgent.
 *
 * This is a named function so that it can be stripped via the jscompiler
 * option for stripping types.
 * @private
 */
goog.userAgent.init_ = function() {
  /**
   * Whether the user agent string denotes Opera.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedOpera_ = false;

  /**
   * Whether the user agent string denotes Internet Explorer. This includes
   * other browsers using Trident as its rendering engine. For example AOL
   * and Netscape 8
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedIe_ = false;

  /**
   * Whether the user agent string denotes WebKit. WebKit is the rendering
   * engine that Safari, Android and others use.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedWebkit_ = false;

  /**
   * Whether the user agent string denotes a mobile device.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedMobile_ = false;

  /**
   * Whether the user agent string denotes Gecko. Gecko is the rendering
   * engine used by Mozilla, Mozilla Firefox, Camino and many more.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedGecko_ = false;

  var ua;
  if (!goog.userAgent.BROWSER_KNOWN_ &&
      (ua = goog.userAgent.getUserAgentString())) {
    var navigator = goog.userAgent.getNavigator();
    goog.userAgent.detectedOpera_ = ua.indexOf('Opera') == 0;
    goog.userAgent.detectedIe_ = !goog.userAgent.detectedOpera_ &&
        ua.indexOf('MSIE') != -1;
    goog.userAgent.detectedWebkit_ = !goog.userAgent.detectedOpera_ &&
        ua.indexOf('WebKit') != -1;
    // WebKit also gives navigator.product string equal to 'Gecko'.
    goog.userAgent.detectedMobile_ = goog.userAgent.detectedWebkit_ &&
        ua.indexOf('Mobile') != -1;
    goog.userAgent.detectedGecko_ = !goog.userAgent.detectedOpera_ &&
        !goog.userAgent.detectedWebkit_ && navigator.product == 'Gecko';
  }
};


if (!goog.userAgent.BROWSER_KNOWN_) {
  goog.userAgent.init_();
}


/**
 * Whether the user agent is Opera.
 * @type {boolean}
 */
goog.userAgent.OPERA = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_OPERA : goog.userAgent.detectedOpera_;


/**
 * Whether the user agent is Internet Explorer. This includes other browsers
 * using Trident as its rendering engine. For example AOL and Netscape 8
 * @type {boolean}
 */
goog.userAgent.IE = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_IE : goog.userAgent.detectedIe_;


/**
 * Whether the user agent is Gecko. Gecko is the rendering engine used by
 * Mozilla, Mozilla Firefox, Camino and many more.
 * @type {boolean}
 */
goog.userAgent.GECKO = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_GECKO :
    goog.userAgent.detectedGecko_;


/**
 * Whether the user agent is WebKit. WebKit is the rendering engine that
 * Safari, Android and others use.
 * @type {boolean}
 */
goog.userAgent.WEBKIT = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_WEBKIT || goog.userAgent.ASSUME_MOBILE_WEBKIT :
    goog.userAgent.detectedWebkit_;


/**
 * Whether the user agent is running on a mobile device.
 * @type {boolean}
 */
goog.userAgent.MOBILE = goog.userAgent.ASSUME_MOBILE_WEBKIT ||
                        goog.userAgent.detectedMobile_;


/**
 * Used while transitioning code to use WEBKIT instead.
 * @type {boolean}
 * @deprecated Use {@link goog.userAgent.product.SAFARI} instead.
 * TODO(nicksantos): Delete this from goog.userAgent.
 */
goog.userAgent.SAFARI = goog.userAgent.WEBKIT;


/**
 * @return {string} the platform (operating system) the user agent is running
 *     on. Default to empty string because navigator.platform may not be defined
 *     (on Rhino, for example).
 * @private
 */
goog.userAgent.determinePlatform_ = function() {
  var navigator = goog.userAgent.getNavigator();
  return navigator && navigator.platform || '';
};


/**
 * The platform (operating system) the user agent is running on. Default to
 * empty string because navigator.platform may not be defined (on Rhino, for
 * example).
 * @type {string}
 */
goog.userAgent.PLATFORM = goog.userAgent.determinePlatform_();


/**
 * @define {boolean} Whether the user agent is running on a Macintosh operating
 *     system.
 */
goog.userAgent.ASSUME_MAC = false;


/**
 * @define {boolean} Whether the user agent is running on a Windows operating
 *     system.
 */
goog.userAgent.ASSUME_WINDOWS = false;


/**
 * @define {boolean} Whether the user agent is running on a Linux operating
 *     system.
 */
goog.userAgent.ASSUME_LINUX = false;


/**
 * @define {boolean} Whether the user agent is running on a X11 windowing
 *     system.
 */
goog.userAgent.ASSUME_X11 = false;


/**
 * @type {boolean}
 * @private
 */
goog.userAgent.PLATFORM_KNOWN_ =
    goog.userAgent.ASSUME_MAC ||
    goog.userAgent.ASSUME_WINDOWS ||
    goog.userAgent.ASSUME_LINUX ||
    goog.userAgent.ASSUME_X11;


/**
 * Initialize the goog.userAgent constants that define which platform the user
 * agent is running on.
 * @private
 */
goog.userAgent.initPlatform_ = function() {
  /**
   * Whether the user agent is running on a Macintosh operating system.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedMac_ = goog.string.contains(goog.userAgent.PLATFORM,
      'Mac');

  /**
   * Whether the user agent is running on a Windows operating system.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedWindows_ = goog.string.contains(
      goog.userAgent.PLATFORM, 'Win');

  /**
   * Whether the user agent is running on a Linux operating system.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedLinux_ = goog.string.contains(goog.userAgent.PLATFORM,
      'Linux');

  /**
   * Whether the user agent is running on a X11 windowing system.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedX11_ = !!goog.userAgent.getNavigator() &&
      goog.string.contains(goog.userAgent.getNavigator()['appVersion'] || '',
          'X11');
};


if (!goog.userAgent.PLATFORM_KNOWN_) {
  goog.userAgent.initPlatform_();
}


/**
 * Whether the user agent is running on a Macintosh operating system.
 * @type {boolean}
 */
goog.userAgent.MAC = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_MAC : goog.userAgent.detectedMac_;


/**
 * Whether the user agent is running on a Windows operating system.
 * @type {boolean}
 */
goog.userAgent.WINDOWS = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_WINDOWS : goog.userAgent.detectedWindows_;


/**
 * Whether the user agent is running on a Linux operating system.
 * @type {boolean}
 */
goog.userAgent.LINUX = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_LINUX : goog.userAgent.detectedLinux_;


/**
 * Whether the user agent is running on a X11 windowing system.
 * @type {boolean}
 */
goog.userAgent.X11 = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_X11 : goog.userAgent.detectedX11_;


/**
 * @return {string} The string that describes the version number of the user
 *     agent.
 * @private
 */
goog.userAgent.determineVersion_ = function() {
  // All browsers have different ways to detect the version and they all have
  // different naming schemes.

  // version is a string rather than a number because it may contain 'b', 'a',
  // and so on.
  var version = '', re;

  if (goog.userAgent.OPERA && goog.global['opera']) {
    var operaVersion = goog.global['opera'].version;
    version = typeof operaVersion == 'function' ? operaVersion() : operaVersion;
  } else {
    if (goog.userAgent.GECKO) {
      re = /rv\:([^\);]+)(\)|;)/;
    } else if (goog.userAgent.IE) {
      re = /MSIE\s+([^\);]+)(\)|;)/;
    } else if (goog.userAgent.WEBKIT) {
      // WebKit/125.4
      re = /WebKit\/(\S+)/;
    }
    if (re) {
      var arr = re.exec(goog.userAgent.getUserAgentString());
      version = arr ? arr[1] : '';
    }
  }
  if (goog.userAgent.IE) {
    // IE9 can be in document mode 9 but be reporting an inconsistent user agent
    // version.  If it is identifying as a version lower than 9 we take the
    // documentMode as the version instead.  IE8 has similar behavior.
    // It is recommended to set the X-UA-Compatible header to ensure that IE9
    // uses documentMode 9.
    var docMode = goog.userAgent.getDocumentMode_();
    if (docMode > parseFloat(version)) {
      return String(docMode);
    }
  }
  return version;
};


/**
 * @return {number|undefined} Returns the document mode (for testing).
 * @private
 */
goog.userAgent.getDocumentMode_ = function() {
  // NOTE(user): goog.userAgent may be used in context where there is no DOM.
  var doc = goog.global['document'];
  return doc ? doc['documentMode'] : undefined;
};


/**
 * The version of the user agent. This is a string because it might contain
 * 'b' (as in beta) as well as multiple dots.
 * @type {string}
 */
goog.userAgent.VERSION = goog.userAgent.determineVersion_();


/**
 * Compares two version numbers.
 *
 * @param {string} v1 Version of first item.
 * @param {string} v2 Version of second item.
 *
 * @return {number}  1 if first argument is higher
 *                   0 if arguments are equal
 *                  -1 if second argument is higher.
 * @deprecated Use goog.string.compareVersions.
 */
goog.userAgent.compare = function(v1, v2) {
  return goog.string.compareVersions(v1, v2);
};


/**
 * Cache for {@link goog.userAgent.isVersion}. Calls to compareVersions are
 * surprisingly expensive and as a browsers version number is unlikely to change
 * during a session we cache the results.
 * @type {Object}
 * @private
 */
goog.userAgent.isVersionCache_ = {};


/**
 * Whether the user agent version is higher or the same as the given version.
 * NOTE: When checking the version numbers for Firefox and Safari, be sure to
 * use the engine's version, not the browser's version number.  For example,
 * Firefox 3.0 corresponds to Gecko 1.9 and Safari 3.0 to Webkit 522.11.
 * Opera and Internet Explorer versions match the product release number.<br>
 * @see <a href="http://en.wikipedia.org/wiki/Safari_version_history">
 *     Webkit</a>
 * @see <a href="http://en.wikipedia.org/wiki/Gecko_engine">Gecko</a>
 *
 * @param {string|number} version The version to check.
 * @return {boolean} Whether the user agent version is higher or the same as
 *     the given version.
 */
goog.userAgent.isVersion = function(version) {
  return goog.userAgent.ASSUME_ANY_VERSION ||
      goog.userAgent.isVersionCache_[version] ||
      (goog.userAgent.isVersionCache_[version] =
          goog.string.compareVersions(goog.userAgent.VERSION, version) >= 0);
};


/**
 * Cache for {@link goog.userAgent.isDocumentMode}.
 * Browsers document mode version number is unlikely to change during a session
 * we cache the results.
 * @type {Object}
 * @private
 */
goog.userAgent.isDocumentModeCache_ = {};


/**
 * Whether the IE effective document mode is higher or the same as the given
 * document mode version.
 * NOTE: Only for IE, return false for another browser.
 *
 * @param {number} documentMode The document mode version to check.
 * @return {boolean} Whether the IE effective document mode is higher or the
 *     same as the given version.
 */
goog.userAgent.isDocumentMode = function(documentMode) {
  return goog.userAgent.isDocumentModeCache_[documentMode] ||
      (goog.userAgent.isDocumentModeCache_[documentMode] = goog.userAgent.IE &&
      !!document.documentMode && document.documentMode >= documentMode);
};
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Browser capability checks for the dom package.
 *
 */


goog.provide('goog.dom.BrowserFeature');

goog.require('goog.userAgent');


/**
 * Enum of browser capabilities.
 * @enum {boolean}
 */
goog.dom.BrowserFeature = {
  /**
   * Whether attributes 'name' and 'type' can be added to an element after it's
   * created. False in Internet Explorer prior to version 9.
   */
  CAN_ADD_NAME_OR_TYPE_ATTRIBUTES: !goog.userAgent.IE ||
      goog.userAgent.isDocumentMode(9),

  /**
   * Whether we can use element.children to access an element's Element
   * children. Available since Gecko 1.9.1, IE 9. (IE<9 also includes comment
   * nodes in the collection.)
   */
  CAN_USE_CHILDREN_ATTRIBUTE: !goog.userAgent.GECKO && !goog.userAgent.IE ||
      goog.userAgent.IE && goog.userAgent.isDocumentMode(9) ||
      goog.userAgent.GECKO && goog.userAgent.isVersion('1.9.1'),

  /**
   * Opera, Safari 3, and Internet Explorer 9 all support innerText but they
   * include text nodes in script and style tags. Not document-mode-dependent.
   */
  CAN_USE_INNER_TEXT: goog.userAgent.IE && !goog.userAgent.isVersion('9'),

  /**
   * MSIE, Opera, and Safari>=4 support element.parentElement to access an
   * element's parent if it is an Element.
   */
  CAN_USE_PARENT_ELEMENT_PROPERTY: goog.userAgent.IE || goog.userAgent.OPERA ||
      goog.userAgent.WEBKIT,

  /**
   * Whether NoScope elements need a scoped element written before them in
   * innerHTML.
   * MSDN: http://msdn.microsoft.com/en-us/library/ms533897(VS.85).aspx#1
   */
  INNER_HTML_NEEDS_SCOPED_ELEMENT: goog.userAgent.IE
};
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines the goog.dom.TagName enum.  This enumerates
 * all html tag names specified by the W3C HTML 4.01 Specification.
 * Reference http://www.w3.org/TR/html401/index/elements.html.
 */
goog.provide('goog.dom.TagName');


/**
 * Enum of all html tag names specified by the W3C HTML 4.01 Specification.
 * Reference http://www.w3.org/TR/html401/index/elements.html
 * @enum {string}
 */
goog.dom.TagName = {
  A: 'A',
  ABBR: 'ABBR',
  ACRONYM: 'ACRONYM',
  ADDRESS: 'ADDRESS',
  APPLET: 'APPLET',
  AREA: 'AREA',
  AUDIO: 'AUDIO',
  B: 'B',
  BASE: 'BASE',
  BASEFONT: 'BASEFONT',
  BDO: 'BDO',
  BIG: 'BIG',
  BLOCKQUOTE: 'BLOCKQUOTE',
  BODY: 'BODY',
  BR: 'BR',
  BUTTON: 'BUTTON',
  CANVAS: 'CANVAS',
  CAPTION: 'CAPTION',
  CENTER: 'CENTER',
  CITE: 'CITE',
  CODE: 'CODE',
  COL: 'COL',
  COLGROUP: 'COLGROUP',
  DD: 'DD',
  DEL: 'DEL',
  DFN: 'DFN',
  DIR: 'DIR',
  DIV: 'DIV',
  DL: 'DL',
  DT: 'DT',
  EM: 'EM',
  FIELDSET: 'FIELDSET',
  FONT: 'FONT',
  FORM: 'FORM',
  FRAME: 'FRAME',
  FRAMESET: 'FRAMESET',
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  H4: 'H4',
  H5: 'H5',
  H6: 'H6',
  HEAD: 'HEAD',
  HR: 'HR',
  HTML: 'HTML',
  I: 'I',
  IFRAME: 'IFRAME',
  IMG: 'IMG',
  INPUT: 'INPUT',
  INS: 'INS',
  ISINDEX: 'ISINDEX',
  KBD: 'KBD',
  LABEL: 'LABEL',
  LEGEND: 'LEGEND',
  LI: 'LI',
  LINK: 'LINK',
  MAP: 'MAP',
  MENU: 'MENU',
  META: 'META',
  NOFRAMES: 'NOFRAMES',
  NOSCRIPT: 'NOSCRIPT',
  OBJECT: 'OBJECT',
  OL: 'OL',
  OPTGROUP: 'OPTGROUP',
  OPTION: 'OPTION',
  P: 'P',
  PARAM: 'PARAM',
  PRE: 'PRE',
  Q: 'Q',
  S: 'S',
  SAMP: 'SAMP',
  SCRIPT: 'SCRIPT',
  SELECT: 'SELECT',
  SMALL: 'SMALL',
  SPAN: 'SPAN',
  STRIKE: 'STRIKE',
  STRONG: 'STRONG',
  STYLE: 'STYLE',
  SUB: 'SUB',
  SUP: 'SUP',
  TABLE: 'TABLE',
  TBODY: 'TBODY',
  TD: 'TD',
  TEXTAREA: 'TEXTAREA',
  TFOOT: 'TFOOT',
  TH: 'TH',
  THEAD: 'THEAD',
  TITLE: 'TITLE',
  TR: 'TR',
  TT: 'TT',
  U: 'U',
  UL: 'UL',
  VAR: 'VAR',
  VIDEO: 'VIDEO'
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for adding, removing and setting classes.
 *
 */


goog.provide('goog.dom.classes');

goog.require('goog.array');


/**
 * Sets the entire class name of an element.
 * @param {Node} element DOM node to set class of.
 * @param {string} className Class name(s) to apply to element.
 */
goog.dom.classes.set = function(element, className) {
  element.className = className;
};


/**
 * Gets an array of class names on an element
 * @param {Node} element DOM node to get class of.
 * @return {!Array} Class names on {@code element}. Some browsers add extra
 *     properties to the array. Do not depend on any of these!
 */
goog.dom.classes.get = function(element) {
  var className = element.className;
  // Some types of elements don't have a className in IE (e.g. iframes).
  // Furthermore, in Firefox, className is not a string when the element is
  // an SVG element.
  return goog.isString(className) && className.match(/\S+/g) || [];
};


/**
 * Adds a class or classes to an element. Does not add multiples of class names.
 * @param {Node} element DOM node to add class to.
 * @param {...string} var_args Class names to add.
 * @return {boolean} Whether class was added (or all classes were added).
 */
goog.dom.classes.add = function(element, var_args) {
  var classes = goog.dom.classes.get(element);
  var args = goog.array.slice(arguments, 1);
  var expectedCount = classes.length + args.length;
  goog.dom.classes.add_(classes, args);
  element.className = classes.join(' ');
  return classes.length == expectedCount;
};


/**
 * Removes a class or classes from an element.
 * @param {Node} element DOM node to remove class from.
 * @param {...string} var_args Class name(s) to remove.
 * @return {boolean} Whether all classes in {@code var_args} were found and
 *     removed.
 */
goog.dom.classes.remove = function(element, var_args) {
  var classes = goog.dom.classes.get(element);
  var args = goog.array.slice(arguments, 1);
  var newClasses = goog.dom.classes.getDifference_(classes, args);
  element.className = newClasses.join(' ');
  return newClasses.length == classes.length - args.length;
};


/**
 * Helper method for {@link goog.dom.classes.add} and
 * {@link goog.dom.classes.addRemove}. Adds one or more classes to the supplied
 * classes array.
 * @param {Array.<string>} classes All class names for the element, will be
 *     updated to have the classes supplied in {@code args} added.
 * @param {Array.<string>} args Class names to add.
 * @private
 */
goog.dom.classes.add_ = function(classes, args) {
  for (var i = 0; i < args.length; i++) {
    if (!goog.array.contains(classes, args[i])) {
      classes.push(args[i]);
    }
  }
};


/**
 * Helper method for {@link goog.dom.classes.remove} and
 * {@link goog.dom.classes.addRemove}. Calculates the difference of two arrays.
 * @param {!Array.<string>} arr1 First array.
 * @param {!Array.<string>} arr2 Second array.
 * @return {!Array.<string>} The first array without the elements of the second
 *     array.
 * @private
 */
goog.dom.classes.getDifference_ = function(arr1, arr2) {
  return goog.array.filter(arr1, function(item) {
    return !goog.array.contains(arr2, item);
  });
};


/**
 * Switches a class on an element from one to another without disturbing other
 * classes. If the fromClass isn't removed, the toClass won't be added.
 * @param {Node} element DOM node to swap classes on.
 * @param {string} fromClass Class to remove.
 * @param {string} toClass Class to add.
 * @return {boolean} Whether classes were switched.
 */
goog.dom.classes.swap = function(element, fromClass, toClass) {
  var classes = goog.dom.classes.get(element);

  var removed = false;
  for (var i = 0; i < classes.length; i++) {
    if (classes[i] == fromClass) {
      goog.array.splice(classes, i--, 1);
      removed = true;
    }
  }

  if (removed) {
    classes.push(toClass);
    element.className = classes.join(' ');
  }

  return removed;
};


/**
 * Adds zero or more classes to an element and removes zero or more as a single
 * operation. Unlike calling {@link goog.dom.classes.add} and
 * {@link goog.dom.classes.remove} separately, this is more efficient as it only
 * parses the class property once.
 *
 * If a class is in both the remove and add lists, it will be added. Thus,
 * you can use this instead of {@link goog.dom.classes.swap} when you have
 * more than two class names that you want to swap.
 *
 * @param {Node} element DOM node to swap classes on.
 * @param {?(string|Array.<string>)} classesToRemove Class or classes to
 *     remove, if null no classes are removed.
 * @param {?(string|Array.<string>)} classesToAdd Class or classes to add, if
 *     null no classes are added.
 */
goog.dom.classes.addRemove = function(element, classesToRemove, classesToAdd) {
  var classes = goog.dom.classes.get(element);
  if (goog.isString(classesToRemove)) {
    goog.array.remove(classes, classesToRemove);
  } else if (goog.isArray(classesToRemove)) {
    classes = goog.dom.classes.getDifference_(classes, classesToRemove);
  }

  if (goog.isString(classesToAdd) &&
      !goog.array.contains(classes, classesToAdd)) {
    classes.push(classesToAdd);
  } else if (goog.isArray(classesToAdd)) {
    goog.dom.classes.add_(classes, classesToAdd);
  }

  element.className = classes.join(' ');
};


/**
 * Returns true if an element has a class.
 * @param {Node} element DOM node to test.
 * @param {string} className Class name to test for.
 * @return {boolean} Whether element has the class.
 */
goog.dom.classes.has = function(element, className) {
  return goog.array.contains(goog.dom.classes.get(element), className);
};


/**
 * Adds or removes a class depending on the enabled argument.
 * @param {Node} element DOM node to add or remove the class on.
 * @param {string} className Class name to add or remove.
 * @param {boolean} enabled Whether to add or remove the class (true adds,
 *     false removes).
 */
goog.dom.classes.enable = function(element, className, enabled) {
  if (enabled) {
    goog.dom.classes.add(element, className);
  } else {
    goog.dom.classes.remove(element, className);
  }
};


/**
 * Removes a class if an element has it, and adds it the element doesn't have
 * it.  Won't affect other classes on the node.
 * @param {Node} element DOM node to toggle class on.
 * @param {string} className Class to toggle.
 * @return {boolean} True if class was added, false if it was removed
 *     (in other words, whether element has the class after this function has
 *     been called).
 */
goog.dom.classes.toggle = function(element, className) {
  var add = !goog.dom.classes.has(element, className);
  goog.dom.classes.enable(element, className, add);
  return add;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A utility class for representing two-dimensional positions.
 */


goog.provide('goog.math.Coordinate');



/**
 * Class for representing coordinates and positions.
 * @param {number=} opt_x Left, defaults to 0.
 * @param {number=} opt_y Top, defaults to 0.
 * @constructor
 */
goog.math.Coordinate = function(opt_x, opt_y) {
  /**
   * X-value
   * @type {number}
   */
  this.x = goog.isDef(opt_x) ? opt_x : 0;

  /**
   * Y-value
   * @type {number}
   */
  this.y = goog.isDef(opt_y) ? opt_y : 0;
};


/**
 * Returns a new copy of the coordinate.
 * @return {!goog.math.Coordinate} A clone of this coordinate.
 */
goog.math.Coordinate.prototype.clone = function() {
  return new goog.math.Coordinate(this.x, this.y);
};


if (goog.DEBUG) {
  /**
   * Returns a nice string representing the coordinate.
   * @return {string} In the form (50, 73).
   */
  goog.math.Coordinate.prototype.toString = function() {
    return '(' + this.x + ', ' + this.y + ')';
  };
}


/**
 * Compares coordinates for equality.
 * @param {goog.math.Coordinate} a A Coordinate.
 * @param {goog.math.Coordinate} b A Coordinate.
 * @return {boolean} True iff the coordinates are equal, or if both are null.
 */
goog.math.Coordinate.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.x == b.x && a.y == b.y;
};


/**
 * Returns the distance between two coordinates.
 * @param {!goog.math.Coordinate} a A Coordinate.
 * @param {!goog.math.Coordinate} b A Coordinate.
 * @return {number} The distance between {@code a} and {@code b}.
 */
goog.math.Coordinate.distance = function(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};


/**
 * Returns the squared distance between two coordinates. Squared distances can
 * be used for comparisons when the actual value is not required.
 *
 * Performance note: eliminating the square root is an optimization often used
 * in lower-level languages, but the speed difference is not nearly as
 * pronounced in JavaScript (only a few percent.)
 *
 * @param {!goog.math.Coordinate} a A Coordinate.
 * @param {!goog.math.Coordinate} b A Coordinate.
 * @return {number} The squared distance between {@code a} and {@code b}.
 */
goog.math.Coordinate.squaredDistance = function(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return dx * dx + dy * dy;
};


/**
 * Returns the difference between two coordinates as a new
 * goog.math.Coordinate.
 * @param {!goog.math.Coordinate} a A Coordinate.
 * @param {!goog.math.Coordinate} b A Coordinate.
 * @return {!goog.math.Coordinate} A Coordinate representing the difference
 *     between {@code a} and {@code b}.
 */
goog.math.Coordinate.difference = function(a, b) {
  return new goog.math.Coordinate(a.x - b.x, a.y - b.y);
};


/**
 * Returns the sum of two coordinates as a new goog.math.Coordinate.
 * @param {!goog.math.Coordinate} a A Coordinate.
 * @param {!goog.math.Coordinate} b A Coordinate.
 * @return {!goog.math.Coordinate} A Coordinate representing the sum of the two
 *     coordinates.
 */
goog.math.Coordinate.sum = function(a, b) {
  return new goog.math.Coordinate(a.x + b.x, a.y + b.y);
};
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A utility class for representing two-dimensional sizes.
 */


goog.provide('goog.math.Size');



/**
 * Class for representing sizes consisting of a width and height. Undefined
 * width and height support is deprecated and results in compiler warning.
 * @param {number} width Width.
 * @param {number} height Height.
 * @constructor
 */
goog.math.Size = function(width, height) {
  /**
   * Width
   * @type {number}
   */
  this.width = width;

  /**
   * Height
   * @type {number}
   */
  this.height = height;
};


/**
 * Compares sizes for equality.
 * @param {goog.math.Size} a A Size.
 * @param {goog.math.Size} b A Size.
 * @return {boolean} True iff the sizes have equal widths and equal
 *     heights, or if both are null.
 */
goog.math.Size.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.width == b.width && a.height == b.height;
};


/**
 * @return {!goog.math.Size} A new copy of the Size.
 */
goog.math.Size.prototype.clone = function() {
  return new goog.math.Size(this.width, this.height);
};


if (goog.DEBUG) {
  /**
   * Returns a nice string representing size.
   * @return {string} In the form (50 x 73).
   */
  goog.math.Size.prototype.toString = function() {
    return '(' + this.width + ' x ' + this.height + ')';
  };
}


/**
 * @return {number} The longer of the two dimensions in the size.
 */
goog.math.Size.prototype.getLongest = function() {
  return Math.max(this.width, this.height);
};


/**
 * @return {number} The shorter of the two dimensions in the size.
 */
goog.math.Size.prototype.getShortest = function() {
  return Math.min(this.width, this.height);
};


/**
 * @return {number} The area of the size (width * height).
 */
goog.math.Size.prototype.area = function() {
  return this.width * this.height;
};


/**
 * @return {number} The perimeter of the size (width + height) * 2.
 */
goog.math.Size.prototype.perimeter = function() {
  return (this.width + this.height) * 2;
};


/**
 * @return {number} The ratio of the size's width to its height.
 */
goog.math.Size.prototype.aspectRatio = function() {
  return this.width / this.height;
};


/**
 * @return {boolean} True if the size has zero area, false if both dimensions
 *     are non-zero numbers.
 */
goog.math.Size.prototype.isEmpty = function() {
  return !this.area();
};


/**
 * Clamps the width and height parameters upward to integer values.
 * @return {!goog.math.Size} This size with ceil'd components.
 */
goog.math.Size.prototype.ceil = function() {
  this.width = Math.ceil(this.width);
  this.height = Math.ceil(this.height);
  return this;
};


/**
 * @param {!goog.math.Size} target The target size.
 * @return {boolean} True if this Size is the same size or smaller than the
 *     target size in both dimensions.
 */
goog.math.Size.prototype.fitsInside = function(target) {
  return this.width <= target.width && this.height <= target.height;
};


/**
 * Clamps the width and height parameters downward to integer values.
 * @return {!goog.math.Size} This size with floored components.
 */
goog.math.Size.prototype.floor = function() {
  this.width = Math.floor(this.width);
  this.height = Math.floor(this.height);
  return this;
};


/**
 * Rounds the width and height parameters to integer values.
 * @return {!goog.math.Size} This size with rounded components.
 */
goog.math.Size.prototype.round = function() {
  this.width = Math.round(this.width);
  this.height = Math.round(this.height);
  return this;
};


/**
 * Scales the size uniformly by a factor.
 * @param {number} s The scale factor.
 * @return {!goog.math.Size} This Size object after scaling.
 */
goog.math.Size.prototype.scale = function(s) {
  this.width *= s;
  this.height *= s;
  return this;
};


/**
 * Uniformly scales the size to fit inside the dimensions of a given size. The
 * original aspect ratio will be preserved.
 *
 * This function assumes that both Sizes contain strictly positive dimensions.
 * @param {!goog.math.Size} target The target size.
 * @return {!goog.math.Size} This Size object, after optional scaling.
 */
goog.math.Size.prototype.scaleToFit = function(target) {
  var s = this.aspectRatio() > target.aspectRatio() ?
      target.width / this.width :
      target.height / this.height;

  return this.scale(s);
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for manipulating objects/maps/hashes.
 */

goog.provide('goog.object');


/**
 * Calls a function for each element in an object/map/hash.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object)
 *     and the return value is irrelevant.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 */
goog.object.forEach = function(obj, f, opt_obj) {
  for (var key in obj) {
    f.call(opt_obj, obj[key], key, obj);
  }
};


/**
 * Calls a function for each element in an object/map/hash. If that call returns
 * true, adds the element to a new object.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This
 *     function takes 3 arguments (the element, the index and the object)
 *     and should return a boolean. If the return value is true the
 *     element is added to the result object. If it is false the
 *     element is not included.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {!Object} a new object in which only elements that passed the test
 *     are present.
 */
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key];
    }
  }
  return res;
};


/**
 * For every element in an object/map/hash calls a function and inserts the
 * result into a new object.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object)
 *     and should return something. The result will be inserted
 *     into a new object.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {!Object} a new object with the results from f.
 */
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj);
  }
  return res;
};


/**
 * Calls a function for each element in an object/map/hash. If any
 * call returns true, returns true (without checking the rest). If
 * all calls return false, returns false.
 *
 * @param {Object} obj The object to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) and should
 *     return a boolean.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {boolean} true if any element passes the test.
 */
goog.object.some = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      return true;
    }
  }
  return false;
};


/**
 * Calls a function for each element in an object/map/hash. If
 * all calls return true, returns true. If any call returns false, returns
 * false at this point and does not continue to check the remaining elements.
 *
 * @param {Object} obj The object to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) and should
 *     return a boolean.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {boolean} false if any element fails the test.
 */
goog.object.every = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (!f.call(opt_obj, obj[key], key, obj)) {
      return false;
    }
  }
  return true;
};


/**
 * Returns the number of key-value pairs in the object map.
 *
 * @param {Object} obj The object for which to get the number of key-value
 *     pairs.
 * @return {number} The number of key-value pairs in the object map.
 */
goog.object.getCount = function(obj) {
  // JS1.5 has __count__ but it has been deprecated so it raises a warning...
  // in other words do not use. Also __count__ only includes the fields on the
  // actual object and not in the prototype chain.
  var rv = 0;
  for (var key in obj) {
    rv++;
  }
  return rv;
};


/**
 * Returns one key from the object map, if any exists.
 * For map literals the returned key will be the first one in most of the
 * browsers (a know exception is Konqueror).
 *
 * @param {Object} obj The object to pick a key from.
 * @return {string|undefined} The key or undefined if the object is empty.
 */
goog.object.getAnyKey = function(obj) {
  for (var key in obj) {
    return key;
  }
};


/**
 * Returns one value from the object map, if any exists.
 * For map literals the returned value will be the first one in most of the
 * browsers (a know exception is Konqueror).
 *
 * @param {Object} obj The object to pick a value from.
 * @return {*} The value or undefined if the object is empty.
 */
goog.object.getAnyValue = function(obj) {
  for (var key in obj) {
    return obj[key];
  }
};


/**
 * Whether the object/hash/map contains the given object as a value.
 * An alias for goog.object.containsValue(obj, val).
 *
 * @param {Object} obj The object in which to look for val.
 * @param {*} val The object for which to check.
 * @return {boolean} true if val is present.
 */
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val);
};


/**
 * Returns the values of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the values.
 * @return {!Array} The values in the object/map/hash.
 */
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = obj[key];
  }
  return res;
};


/**
 * Returns the keys of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the keys.
 * @return {!Array.<string>} Array of property keys.
 */
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = key;
  }
  return res;
};


/**
 * Get a value from an object multiple levels deep.  This is useful for
 * pulling values from deeply nested objects, such as JSON responses.
 * Example usage: getValueByKeys(jsonObj, 'foo', 'entries', 3)
 *
 * @param {!Object} obj An object to get the value from.  Can be array-like.
 * @param {...(string|number|!Array.<number|string>)} var_args A number of keys
 *     (as strings, or nubmers, for array-like objects).  Can also be
 *     specified as a single array of keys.
 * @return {*} The resulting value.  If, at any point, the value for a key
 *     is undefined, returns undefined.
 */
goog.object.getValueByKeys = function(obj, var_args) {
  var isArrayLike = goog.isArrayLike(var_args);
  var keys = isArrayLike ? var_args : arguments;

  // Start with the 2nd parameter for the variable parameters syntax.
  for (var i = isArrayLike ? 0 : 1; i < keys.length; i++) {
    obj = obj[keys[i]];
    if (!goog.isDef(obj)) {
      break;
    }
  }

  return obj;
};


/**
 * Whether the object/map/hash contains the given key.
 *
 * @param {Object} obj The object in which to look for key.
 * @param {*} key The key for which to check.
 * @return {boolean} true If the map contains the key.
 */
goog.object.containsKey = function(obj, key) {
  return key in obj;
};


/**
 * Whether the object/map/hash contains the given value. This is O(n).
 *
 * @param {Object} obj The object in which to look for val.
 * @param {*} val The value for which to check.
 * @return {boolean} true If the map contains the value.
 */
goog.object.containsValue = function(obj, val) {
  for (var key in obj) {
    if (obj[key] == val) {
      return true;
    }
  }
  return false;
};


/**
 * Searches an object for an element that satisfies the given condition and
 * returns its key.
 * @param {Object} obj The object to search in.
 * @param {function(*, string, Object): boolean} f The function to call for
 *     every element. Takes 3 arguments (the value, the key and the object) and
 *     should return a boolean.
 * @param {Object=} opt_this An optional "this" context for the function.
 * @return {string|undefined} The key of an element for which the function
 *     returns true or undefined if no such element is found.
 */
goog.object.findKey = function(obj, f, opt_this) {
  for (var key in obj) {
    if (f.call(opt_this, obj[key], key, obj)) {
      return key;
    }
  }
  return undefined;
};


/**
 * Searches an object for an element that satisfies the given condition and
 * returns its value.
 * @param {Object} obj The object to search in.
 * @param {function(*, string, Object): boolean} f The function to call for
 *     every element. Takes 3 arguments (the value, the key and the object) and
 *     should return a boolean.
 * @param {Object=} opt_this An optional "this" context for the function.
 * @return {*} The value of an element for which the function returns true or
 *     undefined if no such element is found.
 */
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key];
};


/**
 * Whether the object/map/hash is empty.
 *
 * @param {Object} obj The object to test.
 * @return {boolean} true if obj is empty.
 */
goog.object.isEmpty = function(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
};


/**
 * Removes all key value pairs from the object/map/hash.
 *
 * @param {Object} obj The object to clear.
 */
goog.object.clear = function(obj) {
  for (var i in obj) {
    delete obj[i];
  }
};


/**
 * Removes a key-value pair based on the key.
 *
 * @param {Object} obj The object from which to remove the key.
 * @param {*} key The key to remove.
 * @return {boolean} Whether an element was removed.
 */
goog.object.remove = function(obj, key) {
  var rv;
  if ((rv = key in obj)) {
    delete obj[key];
  }
  return rv;
};


/**
 * Adds a key-value pair to the object. Throws an exception if the key is
 * already in use. Use set if you want to change an existing pair.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} val The value to add.
 */
goog.object.add = function(obj, key, val) {
  if (key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val);
};


/**
 * Returns the value for the given key.
 *
 * @param {Object} obj The object from which to get the value.
 * @param {string} key The key for which to get the value.
 * @param {*=} opt_val The value to return if no item is found for the given
 *     key (default is undefined).
 * @return {*} The value for the given key.
 */
goog.object.get = function(obj, key, opt_val) {
  if (key in obj) {
    return obj[key];
  }
  return opt_val;
};


/**
 * Adds a key-value pair to the object/map/hash.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} value The value to add.
 */
goog.object.set = function(obj, key, value) {
  obj[key] = value;
};


/**
 * Adds a key-value pair to the object/map/hash if it doesn't exist yet.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} value The value to add if the key wasn't present.
 * @return {*} The value of the entry at the end of the function.
 */
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : (obj[key] = value);
};


/**
 * Does a flat clone of the object.
 *
 * @param {Object} obj Object to clone.
 * @return {!Object} Clone of the input object.
 */
goog.object.clone = function(obj) {
  // We cannot use the prototype trick because a lot of methods depend on where
  // the actual key is set.

  var res = {};
  for (var key in obj) {
    res[key] = obj[key];
  }
  return res;
  // We could also use goog.mixin but I wanted this to be independent from that.
};


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.object.unsafeClone</code> does not detect reference loops. Objects
 * that refer to themselves will cause infinite recursion.
 *
 * <code>goog.object.unsafeClone</code> is unaware of unique identifiers, and
 * copies UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 */
goog.object.unsafeClone = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.object.unsafeClone(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * Returns a new object in which all the keys and values are interchanged
 * (keys become values and values become keys). If multiple keys map to the
 * same value, the chosen transposed value is implementation-dependent.
 *
 * @param {Object} obj The object to transpose.
 * @return {!Object} The transposed object.
 */
goog.object.transpose = function(obj) {
  var transposed = {};
  for (var key in obj) {
    transposed[obj[key]] = key;
  }
  return transposed;
};


/**
 * The names of the fields that are defined on Object.prototype.
 * @type {Array.<string>}
 * @private
 */
goog.object.PROTOTYPE_FIELDS_ = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];


/**
 * Extends an object with another object.
 * This operates 'in-place'; it does not create a new Object.
 *
 * Example:
 * var o = {};
 * goog.object.extend(o, {a: 0, b: 1});
 * o; // {a: 0, b: 1}
 * goog.object.extend(o, {c: 2});
 * o; // {a: 0, b: 1, c: 2}
 *
 * @param {Object} target  The object to modify.
 * @param {...Object} var_args The objects from which values will be copied.
 */
goog.object.extend = function(target, var_args) {
  var key, source;
  for (var i = 1; i < arguments.length; i++) {
    source = arguments[i];
    for (key in source) {
      target[key] = source[key];
    }

    // For IE the for-in-loop does not contain any properties that are not
    // enumerable on the prototype object (for example isPrototypeOf from
    // Object.prototype) and it will also not include 'replace' on objects that
    // extend String and change 'replace' (not that it is common for anyone to
    // extend anything except Object).

    for (var j = 0; j < goog.object.PROTOTYPE_FIELDS_.length; j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
};


/**
 * Creates a new object built from the key-value pairs provided as arguments.
 * @param {...*} var_args If only one argument is provided and it is an array
 *     then this is used as the arguments,  otherwise even arguments are used as
 *     the property names and odd arguments are used as the property values.
 * @return {!Object} The new object.
 * @throws {Error} If there are uneven number of arguments or there is only one
 *     non array argument.
 */
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0]);
  }

  if (argLength % 2) {
    throw Error('Uneven number of arguments');
  }

  var rv = {};
  for (var i = 0; i < argLength; i += 2) {
    rv[arguments[i]] = arguments[i + 1];
  }
  return rv;
};


/**
 * Creates a new object where the property names come from the arguments but
 * the value is always set to true
 * @param {...*} var_args If only one argument is provided and it is an array
 *     then this is used as the arguments,  otherwise the arguments are used
 *     as the property names.
 * @return {!Object} The new object.
 */
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0]);
  }

  var rv = {};
  for (var i = 0; i < argLength; i++) {
    rv[arguments[i]] = true;
  }
  return rv;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for manipulating the browser's Document Object Model
 * Inspiration taken *heavily* from mochikit (http://mochikit.com/).
 *
 * You can use {@link goog.dom.DomHelper} to create new dom helpers that refer
 * to a different document object.  This is useful if you are working with
 * frames or multiple windows.
 *
 */


// TODO(arv): Rename/refactor getTextContent and getRawTextContent. The problem
// is that getTextContent should mimic the DOM3 textContent. We should add a
// getInnerText (or getText) which tries to return the visible text, innerText.


goog.provide('goog.dom');
goog.provide('goog.dom.DomHelper');
goog.provide('goog.dom.NodeType');

goog.require('goog.array');
goog.require('goog.dom.BrowserFeature');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classes');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.userAgent');


/**
 * @define {boolean} Whether we know at compile time that the browser is in
 * quirks mode.
 */
goog.dom.ASSUME_QUIRKS_MODE = false;


/**
 * @define {boolean} Whether we know at compile time that the browser is in
 * standards compliance mode.
 */
goog.dom.ASSUME_STANDARDS_MODE = false;


/**
 * Whether we know the compatibility mode at compile time.
 * @type {boolean}
 * @private
 */
goog.dom.COMPAT_MODE_KNOWN_ =
    goog.dom.ASSUME_QUIRKS_MODE || goog.dom.ASSUME_STANDARDS_MODE;


/**
 * Enumeration for DOM node types (for reference)
 * @enum {number}
 */
goog.dom.NodeType = {
  ELEMENT: 1,
  ATTRIBUTE: 2,
  TEXT: 3,
  CDATA_SECTION: 4,
  ENTITY_REFERENCE: 5,
  ENTITY: 6,
  PROCESSING_INSTRUCTION: 7,
  COMMENT: 8,
  DOCUMENT: 9,
  DOCUMENT_TYPE: 10,
  DOCUMENT_FRAGMENT: 11,
  NOTATION: 12
};


/**
 * Gets the DomHelper object for the document where the element resides.
 * @param {(Node|Window)=} opt_element If present, gets the DomHelper for this
 *     element.
 * @return {!goog.dom.DomHelper} The DomHelper.
 */
goog.dom.getDomHelper = function(opt_element) {
  return opt_element ?
      new goog.dom.DomHelper(goog.dom.getOwnerDocument(opt_element)) :
      (goog.dom.defaultDomHelper_ ||
          (goog.dom.defaultDomHelper_ = new goog.dom.DomHelper()));
};


/**
 * Cached default DOM helper.
 * @type {goog.dom.DomHelper}
 * @private
 */
goog.dom.defaultDomHelper_;


/**
 * Gets the document object being used by the dom library.
 * @return {!Document} Document object.
 */
goog.dom.getDocument = function() {
  return document;
};


/**
 * Alias for getElementById. If a DOM node is passed in then we just return
 * that.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 */
goog.dom.getElement = function(element) {
  return goog.isString(element) ?
      document.getElementById(element) : element;
};


/**
 * Alias for getElement.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 * @deprecated Use {@link goog.dom.getElement} instead.
 */
goog.dom.$ = goog.dom.getElement;


/**
 * Looks up elements by both tag and class name, using browser native functions
 * ({@code querySelectorAll}, {@code getElementsByTagName} or
 * {@code getElementsByClassName}) where possible. This function
 * is a useful, if limited, way of collecting a list of DOM elements
 * with certain characteristics.  {@code goog.dom.query} offers a
 * more powerful and general solution which allows matching on CSS3
 * selector expressions, but at increased cost in code size. If all you
 * need is particular tags belonging to a single class, this function
 * is fast and sleek.
 *
 * @see {goog.dom.query}
 *
 * @param {?string=} opt_tag Element tag name.
 * @param {?string=} opt_class Optional class name.
 * @param {(Document|Element)=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.getElementsByTagNameAndClass = function(opt_tag, opt_class, opt_el) {
  return goog.dom.getElementsByTagNameAndClass_(document, opt_tag, opt_class,
                                                opt_el);
};


/**
 * Returns an array of all the elements with the provided className.
 * @see {goog.dom.query}
 * @param {string} className the name of the class to look for.
 * @param {(Document|Element)=} opt_el Optional element to look in.
 * @return { {length: number} } The items found with the class name provided.
 */
goog.dom.getElementsByClass = function(className, opt_el) {
  var parent = opt_el || document;
  if (goog.dom.canUseQuerySelector_(parent)) {
    return parent.querySelectorAll('.' + className);
  } else if (parent.getElementsByClassName) {
    return parent.getElementsByClassName(className);
  }
  return goog.dom.getElementsByTagNameAndClass_(
      document, '*', className, opt_el);
};


/**
 * Returns the first element with the provided className.
 * @see {goog.dom.query}
 * @param {string} className the name of the class to look for.
 * @param {Element|Document=} opt_el Optional element to look in.
 * @return {Element} The first item with the class name provided.
 */
goog.dom.getElementByClass = function(className, opt_el) {
  var parent = opt_el || document;
  var retVal = null;
  if (goog.dom.canUseQuerySelector_(parent)) {
    retVal = parent.querySelector('.' + className);
  } else {
    retVal = goog.dom.getElementsByClass(className, opt_el)[0];
  }
  return retVal || null;
};


/**
 * Prefer the standardized (http://www.w3.org/TR/selectors-api/), native and
 * fast W3C Selectors API. However, the version of WebKit that shipped with
 * Safari 3.1 and Chrome has a bug where it will not correctly match mixed-
 * case class name selectors in quirks mode.
 * @param {!(Element|Document)} parent The parent document object.
 * @return {boolean} whether or not we can use parent.querySelector* APIs.
 * @private
 */
goog.dom.canUseQuerySelector_ = function(parent) {
  return parent.querySelectorAll &&
         parent.querySelector &&
         (!goog.userAgent.WEBKIT || goog.dom.isCss1CompatMode_(document) ||
          goog.userAgent.isVersion('528'));
};


/**
 * Helper for {@code getElementsByTagNameAndClass}.
 * @param {!Document} doc The document to get the elements in.
 * @param {?string=} opt_tag Element tag name.
 * @param {?string=} opt_class Optional class name.
 * @param {(Document|Element)=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 * @private
 */
goog.dom.getElementsByTagNameAndClass_ = function(doc, opt_tag, opt_class,
                                                  opt_el) {
  var parent = opt_el || doc;
  var tagName = (opt_tag && opt_tag != '*') ? opt_tag.toUpperCase() : '';

  if (goog.dom.canUseQuerySelector_(parent) &&
      (tagName || opt_class)) {
    var query = tagName + (opt_class ? '.' + opt_class : '');
    return parent.querySelectorAll(query);
  }

  // Use the native getElementsByClassName if available, under the assumption
  // that even when the tag name is specified, there will be fewer elements to
  // filter through when going by class than by tag name
  if (opt_class && parent.getElementsByClassName) {
    var els = parent.getElementsByClassName(opt_class);

    if (tagName) {
      var arrayLike = {};
      var len = 0;

      // Filter for specific tags if requested.
      for (var i = 0, el; el = els[i]; i++) {
        if (tagName == el.nodeName) {
          arrayLike[len++] = el;
        }
      }
      arrayLike.length = len;

      return arrayLike;
    } else {
      return els;
    }
  }

  var els = parent.getElementsByTagName(tagName || '*');

  if (opt_class) {
    var arrayLike = {};
    var len = 0;
    for (var i = 0, el; el = els[i]; i++) {
      var className = el.className;
      // Check if className has a split function since SVG className does not.
      if (typeof className.split == 'function' &&
          goog.array.contains(className.split(/\s+/), opt_class)) {
        arrayLike[len++] = el;
      }
    }
    arrayLike.length = len;
    return arrayLike;
  } else {
    return els;
  }
};


/**
 * Alias for {@code getElementsByTagNameAndClass}.
 * @param {?string=} opt_tag Element tag name.
 * @param {?string=} opt_class Optional class name.
 * @param {Element=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 * @deprecated Use {@link goog.dom.getElementsByTagNameAndClass} instead.
 */
goog.dom.$$ = goog.dom.getElementsByTagNameAndClass;


/**
 * Sets multiple properties on a node.
 * @param {Element} element DOM node to set properties on.
 * @param {Object} properties Hash of property:value pairs.
 */
goog.dom.setProperties = function(element, properties) {
  goog.object.forEach(properties, function(val, key) {
    if (key == 'style') {
      element.style.cssText = val;
    } else if (key == 'class') {
      element.className = val;
    } else if (key == 'for') {
      element.htmlFor = val;
    } else if (key in goog.dom.DIRECT_ATTRIBUTE_MAP_) {
      element.setAttribute(goog.dom.DIRECT_ATTRIBUTE_MAP_[key], val);
    } else if (goog.string.startsWith(key, 'aria-')) {
      element.setAttribute(key, val);
    } else {
      element[key] = val;
    }
  });
};


/**
 * Map of attributes that should be set using
 * element.setAttribute(key, val) instead of element[key] = val.  Used
 * by goog.dom.setProperties.
 *
 * @type {Object}
 * @private
 */
goog.dom.DIRECT_ATTRIBUTE_MAP_ = {
  'cellpadding': 'cellPadding',
  'cellspacing': 'cellSpacing',
  'colspan': 'colSpan',
  'rowspan': 'rowSpan',
  'valign': 'vAlign',
  'height': 'height',
  'width': 'width',
  'usemap': 'useMap',
  'frameborder': 'frameBorder',
  'maxlength': 'maxLength',
  'type': 'type'
};


/**
 * Gets the dimensions of the viewport.
 *
 * Gecko Standards mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of body element.
 *
 * docEl.clientHeight Height of viewport excluding scrollbar.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of document.
 *
 * Gecko Backwards compatible mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight Height of document.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * IE6/7 Standards mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Undefined.
 * body.clientWidth   Width of body element.
 *
 * docEl.clientHeight Height of viewport excluding scrollbar.
 * win.innerHeight    Undefined.
 * body.clientHeight  Height of document element.
 *
 * IE5 + IE6/7 Backwards compatible mode:
 * docEl.clientWidth  0.
 * win.innerWidth     Undefined.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight 0.
 * win.innerHeight    Undefined.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * Opera 9 Standards and backwards compatible mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight Height of document.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * WebKit:
 * Safari 2
 * docEl.clientHeight Same as scrollHeight.
 * docEl.clientWidth  Same as innerWidth.
 * win.innerWidth     Width of viewport excluding scrollbar.
 * win.innerHeight    Height of the viewport including scrollbar.
 * frame.innerHeight  Height of the viewport exluding scrollbar.
 *
 * Safari 3 (tested in 522)
 *
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * docEl.clientHeight Height of viewport excluding scrollbar in strict mode.
 * body.clientHeight  Height of viewport excluding scrollbar in quirks mode.
 *
 * @param {Window=} opt_window Optional window element to test.
 * @return {!goog.math.Size} Object with values 'width' and 'height'.
 */
goog.dom.getViewportSize = function(opt_window) {
  // TODO(arv): This should not take an argument
  return goog.dom.getViewportSize_(opt_window || window);
};


/**
 * Helper for {@code getViewportSize}.
 * @param {Window} win The window to get the view port size for.
 * @return {!goog.math.Size} Object with values 'width' and 'height'.
 * @private
 */
goog.dom.getViewportSize_ = function(win) {
  var doc = win.document;

  if (goog.userAgent.WEBKIT && !goog.userAgent.isVersion('500') &&
      !goog.userAgent.MOBILE) {
    // TODO(doughtie): Sometimes we get something that isn't a valid window
    // object. In this case we just revert to the current window. We need to
    // figure out when this happens and find a real fix for it.
    // See the comments on goog.dom.getWindow.
    if (typeof win.innerHeight == 'undefined') {
      win = window;
    }
    var innerHeight = win.innerHeight;
    var scrollHeight = win.document.documentElement.scrollHeight;

    if (win == win.top) {
      if (scrollHeight < innerHeight) {
        innerHeight -= 15; // Scrollbars are 15px wide on Mac
      }
    }
    return new goog.math.Size(win.innerWidth, innerHeight);
  }

  var el = goog.dom.isCss1CompatMode_(doc) ? doc.documentElement : doc.body;

  return new goog.math.Size(el.clientWidth, el.clientHeight);
};


/**
 * Calculates the height of the document.
 *
 * @return {number} The height of the current document.
 */
goog.dom.getDocumentHeight = function() {
  return goog.dom.getDocumentHeight_(window);
};


/**
 * Calculates the height of the document of the given window.
 *
 * Function code copied from the opensocial gadget api:
 *   gadgets.window.adjustHeight(opt_height)
 *
 * @private
 * @param {Window} win The window whose document height to retrieve.
 * @return {number} The height of the document of the given window.
 */
goog.dom.getDocumentHeight_ = function(win) {
  // NOTE(eae): This method will return the window size rather than the document
  // size in webkit quirks mode.
  var doc = win.document;
  var height = 0;

  if (doc) {
    // Calculating inner content height is hard and different between
    // browsers rendering in Strict vs. Quirks mode.  We use a combination of
    // three properties within document.body and document.documentElement:
    // - scrollHeight
    // - offsetHeight
    // - clientHeight
    // These values differ significantly between browsers and rendering modes.
    // But there are patterns.  It just takes a lot of time and persistence
    // to figure out.

    // Get the height of the viewport
    var vh = goog.dom.getViewportSize_(win).height;
    var body = doc.body;
    var docEl = doc.documentElement;
    if (goog.dom.isCss1CompatMode_(doc) && docEl.scrollHeight) {
      // In Strict mode:
      // The inner content height is contained in either:
      //    document.documentElement.scrollHeight
      //    document.documentElement.offsetHeight
      // Based on studying the values output by different browsers,
      // use the value that's NOT equal to the viewport height found above.
      height = docEl.scrollHeight != vh ?
          docEl.scrollHeight : docEl.offsetHeight;
    } else {
      // In Quirks mode:
      // documentElement.clientHeight is equal to documentElement.offsetHeight
      // except in IE.  In most browsers, document.documentElement can be used
      // to calculate the inner content height.
      // However, in other browsers (e.g. IE), document.body must be used
      // instead.  How do we know which one to use?
      // If document.documentElement.clientHeight does NOT equal
      // document.documentElement.offsetHeight, then use document.body.
      var sh = docEl.scrollHeight;
      var oh = docEl.offsetHeight;
      if (docEl.clientHeight != oh) {
        sh = body.scrollHeight;
        oh = body.offsetHeight;
      }

      // Detect whether the inner content height is bigger or smaller
      // than the bounding box (viewport).  If bigger, take the larger
      // value.  If smaller, take the smaller value.
      if (sh > vh) {
        // Content is larger
        height = sh > oh ? sh : oh;
      } else {
        // Content is smaller
        height = sh < oh ? sh : oh;
      }
    }
  }

  return height;
};


/**
 * Gets the page scroll distance as a coordinate object.
 *
 * @param {Window=} opt_window Optional window element to test.
 * @return {!goog.math.Coordinate} Object with values 'x' and 'y'.
 * @deprecated Use {@link goog.dom.getDocumentScroll} instead.
 */
goog.dom.getPageScroll = function(opt_window) {
  var win = opt_window || goog.global || window;
  return goog.dom.getDomHelper(win.document).getDocumentScroll();
};


/**
 * Gets the document scroll distance as a coordinate object.
 *
 * @return {!goog.math.Coordinate} Object with values 'x' and 'y'.
 */
goog.dom.getDocumentScroll = function() {
  return goog.dom.getDocumentScroll_(document);
};


/**
 * Helper for {@code getDocumentScroll}.
 *
 * @param {!Document} doc The document to get the scroll for.
 * @return {!goog.math.Coordinate} Object with values 'x' and 'y'.
 * @private
 */
goog.dom.getDocumentScroll_ = function(doc) {
  var el = goog.dom.getDocumentScrollElement_(doc);
  var win = goog.dom.getWindow_(doc);
  return new goog.math.Coordinate(win.pageXOffset || el.scrollLeft,
      win.pageYOffset || el.scrollTop);
};


/**
 * Gets the document scroll element.
 * @return {Element} Scrolling element.
 */
goog.dom.getDocumentScrollElement = function() {
  return goog.dom.getDocumentScrollElement_(document);
};


/**
 * Helper for {@code getDocumentScrollElement}.
 * @param {!Document} doc The document to get the scroll element for.
 * @return {Element} Scrolling element.
 * @private
 */
goog.dom.getDocumentScrollElement_ = function(doc) {
  // Safari (2 and 3) needs body.scrollLeft in both quirks mode and strict mode.
  return !goog.userAgent.WEBKIT && goog.dom.isCss1CompatMode_(doc) ?
      doc.documentElement : doc.body;
};


/**
 * Gets the window object associated with the given document.
 *
 * @param {Document=} opt_doc  Document object to get window for.
 * @return {!Window} The window associated with the given document.
 */
goog.dom.getWindow = function(opt_doc) {
  // TODO(arv): This should not take an argument.
  return opt_doc ? goog.dom.getWindow_(opt_doc) : window;
};


/**
 * Helper for {@code getWindow}.
 *
 * @param {!Document} doc  Document object to get window for.
 * @return {!Window} The window associated with the given document.
 * @private
 */
goog.dom.getWindow_ = function(doc) {
  return doc.parentWindow || doc.defaultView;
};


/**
 * Returns a dom node with a set of attributes.  This function accepts varargs
 * for subsequent nodes to be added.  Subsequent nodes will be added to the
 * first node as childNodes.
 *
 * So:
 * <code>createDom('div', null, createDom('p'), createDom('p'));</code>
 * would return a div with two child paragraphs
 *
 * @param {string} tagName Tag to create.
 * @param {(Object|Array.<string>|string)=} opt_attributes If object, then a map
 *     of name-value pairs for attributes. If a string, then this is the
 *     className of the new element. If an array, the elements will be joined
 *     together as the className of the new element.
 * @param {...(Object|string|Array|NodeList)} var_args Further DOM nodes or
 *     strings for text nodes. If one of the var_args is an array or NodeList,i
 *     its elements will be added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 */
goog.dom.createDom = function(tagName, opt_attributes, var_args) {
  return goog.dom.createDom_(document, arguments);
};


/**
 * Helper for {@code createDom}.
 * @param {!Document} doc The document to create the DOM in.
 * @param {!Arguments} args Argument object passed from the callers. See
 *     {@code goog.dom.createDom} for details.
 * @return {!Element} Reference to a DOM node.
 * @private
 */
goog.dom.createDom_ = function(doc, args) {
  var tagName = args[0];
  var attributes = args[1];

  // Internet Explorer is dumb: http://msdn.microsoft.com/workshop/author/
  //                            dhtml/reference/properties/name_2.asp
  // Also does not allow setting of 'type' attribute on 'input' or 'button'.
  if (!goog.dom.BrowserFeature.CAN_ADD_NAME_OR_TYPE_ATTRIBUTES && attributes &&
      (attributes.name || attributes.type)) {
    var tagNameArr = ['<', tagName];
    if (attributes.name) {
      tagNameArr.push(' name="', goog.string.htmlEscape(attributes.name),
                      '"');
    }
    if (attributes.type) {
      tagNameArr.push(' type="', goog.string.htmlEscape(attributes.type),
                      '"');

      // Clone attributes map to remove 'type' without mutating the input.
      var clone = {};
      goog.object.extend(clone, attributes);
      attributes = clone;
      delete attributes.type;
    }
    tagNameArr.push('>');
    tagName = tagNameArr.join('');
  }

  var element = doc.createElement(tagName);

  if (attributes) {
    if (goog.isString(attributes)) {
      element.className = attributes;
    } else if (goog.isArray(attributes)) {
      goog.dom.classes.add.apply(null, [element].concat(attributes));
    } else {
      goog.dom.setProperties(element, attributes);
    }
  }

  if (args.length > 2) {
    goog.dom.append_(doc, element, args, 2);
  }

  return element;
};


/**
 * Appends a node with text or other nodes.
 * @param {!Document} doc The document to create new nodes in.
 * @param {!Node} parent The node to append nodes to.
 * @param {!Arguments} args The values to add. See {@code goog.dom.append}.
 * @param {number} startIndex The index of the array to start from.
 * @private
 */
goog.dom.append_ = function(doc, parent, args, startIndex) {
  function childHandler(child) {
    // TODO(user): More coercion, ala MochiKit?
    if (child) {
      parent.appendChild(goog.isString(child) ?
          doc.createTextNode(child) : child);
    }
  }

  for (var i = startIndex; i < args.length; i++) {
    var arg = args[i];
    // TODO(attila): Fix isArrayLike to return false for a text node.
    if (goog.isArrayLike(arg) && !goog.dom.isNodeLike(arg)) {
      // If the argument is a node list, not a real array, use a clone,
      // because forEach can't be used to mutate a NodeList.
      goog.array.forEach(goog.dom.isNodeList(arg) ?
          goog.array.clone(arg) : arg,
          childHandler);
    } else {
      childHandler(arg);
    }
  }
};


/**
 * Alias for {@code createDom}.
 * @param {string} tagName Tag to create.
 * @param {(string|Object)=} opt_attributes If object, then a map of name-value
 *     pairs for attributes. If a string, then this is the className of the new
 *     element.
 * @param {...(Object|string|Array|NodeList)} var_args Further DOM nodes or
 *     strings for text nodes. If one of the var_args is an array, its
 *     children will be added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 * @deprecated Use {@link goog.dom.createDom} instead.
 */
goog.dom.$dom = goog.dom.createDom;


/**
 * Creates a new element.
 * @param {string} name Tag name.
 * @return {!Element} The new element.
 */
goog.dom.createElement = function(name) {
  return document.createElement(name);
};


/**
 * Creates a new text node.
 * @param {string} content Content.
 * @return {!Text} The new text node.
 */
goog.dom.createTextNode = function(content) {
  return document.createTextNode(content);
};


/**
 * Create a table.
 * @param {number} rows The number of rows in the table.  Must be >= 1.
 * @param {number} columns The number of columns in the table.  Must be >= 1.
 * @param {boolean=} opt_fillWithNbsp If true, fills table entries with nsbps.
 * @return {!Element} The created table.
 */
goog.dom.createTable = function(rows, columns, opt_fillWithNbsp) {
  return goog.dom.createTable_(document, rows, columns, !!opt_fillWithNbsp);
};


/**
 * Create a table.
 * @param {!Document} doc Document object to use to create the table.
 * @param {number} rows The number of rows in the table.  Must be >= 1.
 * @param {number} columns The number of columns in the table.  Must be >= 1.
 * @param {boolean} fillWithNbsp If true, fills table entries with nsbps.
 * @return {!Element} The created table.
 * @private
 */
goog.dom.createTable_ = function(doc, rows, columns, fillWithNbsp) {
  var rowHtml = ['<tr>'];
  for (var i = 0; i < columns; i++) {
    rowHtml.push(fillWithNbsp ? '<td>&nbsp;</td>' : '<td></td>');
  }
  rowHtml.push('</tr>');
  rowHtml = rowHtml.join('');
  var totalHtml = ['<table>'];
  for (i = 0; i < rows; i++) {
    totalHtml.push(rowHtml);
  }
  totalHtml.push('</table>');

  var elem = doc.createElement(goog.dom.TagName.DIV);
  elem.innerHTML = totalHtml.join('');
  return /** @type {!Element} */ (elem.removeChild(elem.firstChild));
};


/**
 * Converts an HTML string into a document fragment.
 *
 * @param {string} htmlString The HTML string to convert.
 * @return {!Node} The resulting document fragment.
 */
goog.dom.htmlToDocumentFragment = function(htmlString) {
  return goog.dom.htmlToDocumentFragment_(document, htmlString);
};


/**
 * Helper for {@code htmlToDocumentFragment}.
 *
 * @param {!Document} doc The document.
 * @param {string} htmlString The HTML string to convert.
 * @return {!Node} The resulting document fragment.
 * @private
 */
goog.dom.htmlToDocumentFragment_ = function(doc, htmlString) {
  var tempDiv = doc.createElement('div');
  if (goog.dom.BrowserFeature.INNER_HTML_NEEDS_SCOPED_ELEMENT) {
    tempDiv.innerHTML = '<br>' + htmlString;
    tempDiv.removeChild(tempDiv.firstChild);
  } else {
    tempDiv.innerHTML = htmlString;
  }
  if (tempDiv.childNodes.length == 1) {
    return /** @type {!Node} */ (tempDiv.removeChild(tempDiv.firstChild));
  } else {
    var fragment = doc.createDocumentFragment();
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    return fragment;
  }
};


/**
 * Returns the compatMode of the document.
 * @return {string} The result is either CSS1Compat or BackCompat.
 * @deprecated use goog.dom.isCss1CompatMode instead.
 */
goog.dom.getCompatMode = function() {
  return goog.dom.isCss1CompatMode() ? 'CSS1Compat' : 'BackCompat';
};


/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @return {boolean} True if in CSS1-compatible mode.
 */
goog.dom.isCss1CompatMode = function() {
  return goog.dom.isCss1CompatMode_(document);
};


/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @param {Document} doc The document to check.
 * @return {boolean} True if in CSS1-compatible mode.
 * @private
 */
goog.dom.isCss1CompatMode_ = function(doc) {
  if (goog.dom.COMPAT_MODE_KNOWN_) {
    return goog.dom.ASSUME_STANDARDS_MODE;
  }

  return doc.compatMode == 'CSS1Compat';
};


/**
 * Determines if the given node can contain children, intended to be used for
 * HTML generation.
 *
 * IE natively supports node.canHaveChildren but has inconsistent behavior.
 * Prior to IE8 the base tag allows children and in IE9 all nodes return true
 * for canHaveChildren.
 *
 * In practice all non-IE browsers allow you to add children to any node, but
 * the behavior is inconsistent:
 *
 * <pre>
 *   var a = document.createElement('br');
 *   a.appendChild(document.createTextNode('foo'));
 *   a.appendChild(document.createTextNode('bar'));
 *   console.log(a.childNodes.length);  // 2
 *   console.log(a.innerHTML);  // Chrome: "", IE9: "foobar", FF3.5: "foobar"
 * </pre>
 *
 * TODO(user): Rename shouldAllowChildren() ?
 *
 * @param {Node} node The node to check.
 * @return {boolean} Whether the node can contain children.
 */
goog.dom.canHaveChildren = function(node) {
  if (node.nodeType != goog.dom.NodeType.ELEMENT) {
    return false;
  }
  switch (node.tagName) {
    case goog.dom.TagName.APPLET:
    case goog.dom.TagName.AREA:
    case goog.dom.TagName.BASE:
    case goog.dom.TagName.BR:
    case goog.dom.TagName.COL:
    case goog.dom.TagName.FRAME:
    case goog.dom.TagName.HR:
    case goog.dom.TagName.IMG:
    case goog.dom.TagName.INPUT:
    case goog.dom.TagName.IFRAME:
    case goog.dom.TagName.ISINDEX:
    case goog.dom.TagName.LINK:
    case goog.dom.TagName.NOFRAMES:
    case goog.dom.TagName.NOSCRIPT:
    case goog.dom.TagName.META:
    case goog.dom.TagName.OBJECT:
    case goog.dom.TagName.PARAM:
    case goog.dom.TagName.SCRIPT:
    case goog.dom.TagName.STYLE:
      return false;
  }
  return true;
};


/**
 * Appends a child to a node.
 * @param {Node} parent Parent.
 * @param {Node} child Child.
 */
goog.dom.appendChild = function(parent, child) {
  parent.appendChild(child);
};


/**
 * Appends a node with text or other nodes.
 * @param {!Node} parent The node to append nodes to.
 * @param {...goog.dom.Appendable} var_args The things to append to the node.
 *     If this is a Node it is appended as is.
 *     If this is a string then a text node is appended.
 *     If this is an array like object then fields 0 to length - 1 are appended.
 */
goog.dom.append = function(parent, var_args) {
  goog.dom.append_(goog.dom.getOwnerDocument(parent), parent, arguments, 1);
};


/**
 * Removes all the child nodes on a DOM node.
 * @param {Node} node Node to remove children from.
 */
goog.dom.removeChildren = function(node) {
  // Note: Iterations over live collections can be slow, this is the fastest
  // we could find. The double parenthesis are used to prevent JsCompiler and
  // strict warnings.
  var child;
  while ((child = node.firstChild)) {
    node.removeChild(child);
  }
};


/**
 * Inserts a new node before an existing reference node (i.e. as the previous
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert before.
 */
goog.dom.insertSiblingBefore = function(newNode, refNode) {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode);
  }
};


/**
 * Inserts a new node after an existing reference node (i.e. as the next
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert after.
 */
goog.dom.insertSiblingAfter = function(newNode, refNode) {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
  }
};


/**
 * Insert a child at a given index. If index is larger than the number of child
 * nodes that the parent currently has, the node is inserted as the last child
 * node.
 * @param {Element} parent The element into which to insert the child.
 * @param {Node} child The element to insert.
 * @param {number} index The index at which to insert the new child node. Must
 *     not be negative.
 */
goog.dom.insertChildAt = function(parent, child, index) {
  // Note that if the second argument is null, insertBefore
  // will append the child at the end of the list of children.
  parent.insertBefore(child, parent.childNodes[index] || null);
};


/**
 * Removes a node from its parent.
 * @param {Node} node The node to remove.
 * @return {Node} The node removed if removed; else, null.
 */
goog.dom.removeNode = function(node) {
  return node && node.parentNode ? node.parentNode.removeChild(node) : null;
};


/**
 * Replaces a node in the DOM tree. Will do nothing if {@code oldNode} has no
 * parent.
 * @param {Node} newNode Node to insert.
 * @param {Node} oldNode Node to replace.
 */
goog.dom.replaceNode = function(newNode, oldNode) {
  var parent = oldNode.parentNode;
  if (parent) {
    parent.replaceChild(newNode, oldNode);
  }
};


/**
 * Flattens an element. That is, removes it and replace it with its children.
 * Does nothing if the element is not in the document.
 * @param {Element} element The element to flatten.
 * @return {Element|undefined} The original element, detached from the document
 *     tree, sans children; or undefined, if the element was not in the document
 *     to begin with.
 */
goog.dom.flattenElement = function(element) {
  var child, parent = element.parentNode;
  if (parent && parent.nodeType != goog.dom.NodeType.DOCUMENT_FRAGMENT) {
    // Use IE DOM method (supported by Opera too) if available
    if (element.removeNode) {
      return /** @type {Element} */ (element.removeNode(false));
    } else {
      // Move all children of the original node up one level.
      while ((child = element.firstChild)) {
        parent.insertBefore(child, element);
      }

      // Detach the original element.
      return /** @type {Element} */ (goog.dom.removeNode(element));
    }
  }
};


/**
 * Returns an array containing just the element children of the given element.
 * @param {Element} element The element whose element children we want.
 * @return {!(Array|NodeList)} An array or array-like list of just the element
 *     children of the given element.
 */
goog.dom.getChildren = function(element) {
  // We check if the children attribute is supported for child elements
  // since IE8 misuses the attribute by also including comments.
  if (goog.dom.BrowserFeature.CAN_USE_CHILDREN_ATTRIBUTE &&
      element.children != undefined) {
    return element.children;
  }
  // Fall back to manually filtering the element's child nodes.
  return goog.array.filter(element.childNodes, function(node) {
    return node.nodeType == goog.dom.NodeType.ELEMENT;
  });
};


/**
 * Returns the first child node that is an element.
 * @param {Node} node The node to get the first child element of.
 * @return {Element} The first child node of {@code node} that is an element.
 */
goog.dom.getFirstElementChild = function(node) {
  if (node.firstElementChild != undefined) {
    return /** @type {Element} */(node).firstElementChild;
  }
  return goog.dom.getNextElementNode_(node.firstChild, true);
};


/**
 * Returns the last child node that is an element.
 * @param {Node} node The node to get the last child element of.
 * @return {Element} The last child node of {@code node} that is an element.
 */
goog.dom.getLastElementChild = function(node) {
  if (node.lastElementChild != undefined) {
    return /** @type {Element} */(node).lastElementChild;
  }
  return goog.dom.getNextElementNode_(node.lastChild, false);
};


/**
 * Returns the first next sibling that is an element.
 * @param {Node} node The node to get the next sibling element of.
 * @return {Element} The next sibling of {@code node} that is an element.
 */
goog.dom.getNextElementSibling = function(node) {
  if (node.nextElementSibling != undefined) {
    return /** @type {Element} */(node).nextElementSibling;
  }
  return goog.dom.getNextElementNode_(node.nextSibling, true);
};


/**
 * Returns the first previous sibling that is an element.
 * @param {Node} node The node to get the previous sibling element of.
 * @return {Element} The first previous sibling of {@code node} that is
 *     an element.
 */
goog.dom.getPreviousElementSibling = function(node) {
  if (node.previousElementSibling != undefined) {
    return /** @type {Element} */(node).previousElementSibling;
  }
  return goog.dom.getNextElementNode_(node.previousSibling, false);
};


/**
 * Returns the first node that is an element in the specified direction,
 * starting with {@code node}.
 * @param {Node} node The node to get the next element from.
 * @param {boolean} forward Whether to look forwards or backwards.
 * @return {Element} The first element.
 * @private
 */
goog.dom.getNextElementNode_ = function(node, forward) {
  while (node && node.nodeType != goog.dom.NodeType.ELEMENT) {
    node = forward ? node.nextSibling : node.previousSibling;
  }

  return /** @type {Element} */ (node);
};


/**
 * Returns the next node in source order from the given node.
 * @param {Node} node The node.
 * @return {Node} The next node in the DOM tree, or null if this was the last
 *     node.
 */
goog.dom.getNextNode = function(node) {
  if (!node) {
    return null;
  }

  if (node.firstChild) {
    return node.firstChild;
  }

  while (node && !node.nextSibling) {
    node = node.parentNode;
  }

  return node ? node.nextSibling : null;
};


/**
 * Returns the previous node in source order from the given node.
 * @param {Node} node The node.
 * @return {Node} The previous node in the DOM tree, or null if this was the
 *     first node.
 */
goog.dom.getPreviousNode = function(node) {
  if (!node) {
    return null;
  }

  if (!node.previousSibling) {
    return node.parentNode;
  }

  node = node.previousSibling;
  while (node && node.lastChild) {
    node = node.lastChild;
  }

  return node;
};


/**
 * Whether the object looks like a DOM node.
 * @param {*} obj The object being tested for node likeness.
 * @return {boolean} Whether the object looks like a DOM node.
 */
goog.dom.isNodeLike = function(obj) {
  return goog.isObject(obj) && obj.nodeType > 0;
};


/**
 * Whether the object looks like an Element.
 * @param {*} obj The object being tested for Element likeness.
 * @return {boolean} Whether the object looks like an Element.
 */
goog.dom.isElement = function(obj) {
  return goog.isObject(obj) && obj.nodeType == goog.dom.NodeType.ELEMENT;
};


/**
 * Returns true if the specified value is a Window object. This includes the
 * global window for HTML pages, and iframe windows.
 * @param {*} obj Variable to test.
 * @return {boolean} Whether the variable is a window.
 */
goog.dom.isWindow = function(obj) {
  return goog.isObject(obj) && obj['window'] == obj;
};


/**
 * Returns an element's parent, if it's an Element.
 * @param {Element} element The DOM element.
 * @return {Element} The parent, or null if not an Element.
 */
goog.dom.getParentElement = function(element) {
  if (goog.dom.BrowserFeature.CAN_USE_PARENT_ELEMENT_PROPERTY) {
    return element.parentElement;
  }
  var parent = element.parentNode;
  return goog.dom.isElement(parent) ? (/** @type {!Element} */ parent) : null;
};


/**
 * Whether a node contains another node.
 * @param {Node} parent The node that should contain the other node.
 * @param {Node} descendant The node to test presence of.
 * @return {boolean} Whether the parent node contains the descendent node.
 */
goog.dom.contains = function(parent, descendant) {
  // We use browser specific methods for this if available since it is faster
  // that way.

  // IE DOM
  if (parent.contains && descendant.nodeType == goog.dom.NodeType.ELEMENT) {
    return parent == descendant || parent.contains(descendant);
  }

  // W3C DOM Level 3
  if (typeof parent.compareDocumentPosition != 'undefined') {
    return parent == descendant ||
        Boolean(parent.compareDocumentPosition(descendant) & 16);
  }

  // W3C DOM Level 1
  while (descendant && parent != descendant) {
    descendant = descendant.parentNode;
  }
  return descendant == parent;
};


/**
 * Compares the document order of two nodes, returning 0 if they are the same
 * node, a negative number if node1 is before node2, and a positive number if
 * node2 is before node1.  Note that we compare the order the tags appear in the
 * document so in the tree <b><i>text</i></b> the B node is considered to be
 * before the I node.
 *
 * @param {Node} node1 The first node to compare.
 * @param {Node} node2 The second node to compare.
 * @return {number} 0 if the nodes are the same node, a negative number if node1
 *     is before node2, and a positive number if node2 is before node1.
 */
goog.dom.compareNodeOrder = function(node1, node2) {
  // Fall out quickly for equality.
  if (node1 == node2) {
    return 0;
  }

  // Use compareDocumentPosition where available
  if (node1.compareDocumentPosition) {
    // 4 is the bitmask for FOLLOWS.
    return node1.compareDocumentPosition(node2) & 2 ? 1 : -1;
  }

  // Process in IE using sourceIndex - we check to see if the first node has
  // a source index or if its parent has one.
  if ('sourceIndex' in node1 ||
      (node1.parentNode && 'sourceIndex' in node1.parentNode)) {
    var isElement1 = node1.nodeType == goog.dom.NodeType.ELEMENT;
    var isElement2 = node2.nodeType == goog.dom.NodeType.ELEMENT;

    if (isElement1 && isElement2) {
      return node1.sourceIndex - node2.sourceIndex;
    } else {
      var parent1 = node1.parentNode;
      var parent2 = node2.parentNode;

      if (parent1 == parent2) {
        return goog.dom.compareSiblingOrder_(node1, node2);
      }

      if (!isElement1 && goog.dom.contains(parent1, node2)) {
        return -1 * goog.dom.compareParentsDescendantNodeIe_(node1, node2);
      }


      if (!isElement2 && goog.dom.contains(parent2, node1)) {
        return goog.dom.compareParentsDescendantNodeIe_(node2, node1);
      }

      return (isElement1 ? node1.sourceIndex : parent1.sourceIndex) -
             (isElement2 ? node2.sourceIndex : parent2.sourceIndex);
    }
  }

  // For Safari, we compare ranges.
  var doc = goog.dom.getOwnerDocument(node1);

  var range1, range2;
  range1 = doc.createRange();
  range1.selectNode(node1);
  range1.collapse(true);

  range2 = doc.createRange();
  range2.selectNode(node2);
  range2.collapse(true);

  return range1.compareBoundaryPoints(goog.global['Range'].START_TO_END,
      range2);
};


/**
 * Utility function to compare the position of two nodes, when
 * {@code textNode}'s parent is an ancestor of {@code node}.  If this entry
 * condition is not met, this function will attempt to reference a null object.
 * @param {Node} textNode The textNode to compare.
 * @param {Node} node The node to compare.
 * @return {number} -1 if node is before textNode, +1 otherwise.
 * @private
 */
goog.dom.compareParentsDescendantNodeIe_ = function(textNode, node) {
  var parent = textNode.parentNode;
  if (parent == node) {
    // If textNode is a child of node, then node comes first.
    return -1;
  }
  var sibling = node;
  while (sibling.parentNode != parent) {
    sibling = sibling.parentNode;
  }
  return goog.dom.compareSiblingOrder_(sibling, textNode);
};


/**
 * Utility function to compare the position of two nodes known to be non-equal
 * siblings.
 * @param {Node} node1 The first node to compare.
 * @param {Node} node2 The second node to compare.
 * @return {number} -1 if node1 is before node2, +1 otherwise.
 * @private
 */
goog.dom.compareSiblingOrder_ = function(node1, node2) {
  var s = node2;
  while ((s = s.previousSibling)) {
    if (s == node1) {
      // We just found node1 before node2.
      return -1;
    }
  }

  // Since we didn't find it, node1 must be after node2.
  return 1;
};


/**
 * Find the deepest common ancestor of the given nodes.
 * @param {...Node} var_args The nodes to find a common ancestor of.
 * @return {Node} The common ancestor of the nodes, or null if there is none.
 *     null will only be returned if two or more of the nodes are from different
 *     documents.
 */
goog.dom.findCommonAncestor = function(var_args) {
  var i, count = arguments.length;
  if (!count) {
    return null;
  } else if (count == 1) {
    return arguments[0];
  }

  var paths = [];
  var minLength = Infinity;
  for (i = 0; i < count; i++) {
    // Compute the list of ancestors.
    var ancestors = [];
    var node = arguments[i];
    while (node) {
      ancestors.unshift(node);
      node = node.parentNode;
    }

    // Save the list for comparison.
    paths.push(ancestors);
    minLength = Math.min(minLength, ancestors.length);
  }
  var output = null;
  for (i = 0; i < minLength; i++) {
    var first = paths[0][i];
    for (var j = 1; j < count; j++) {
      if (first != paths[j][i]) {
        return output;
      }
    }
    output = first;
  }
  return output;
};


/**
 * Returns the owner document for a node.
 * @param {Node|Window} node The node to get the document for.
 * @return {!Document} The document owning the node.
 */
goog.dom.getOwnerDocument = function(node) {
  // TODO(arv): Remove IE5 code.
  // IE5 uses document instead of ownerDocument
  return /** @type {!Document} */ (
      node.nodeType == goog.dom.NodeType.DOCUMENT ? node :
      node.ownerDocument || node.document);
};


/**
 * Cross-browser function for getting the document element of a frame or iframe.
 * @param {Element} frame Frame element.
 * @return {!Document} The frame content document.
 */
goog.dom.getFrameContentDocument = function(frame) {
  var doc = frame.contentDocument || frame.contentWindow.document;
  return doc;
};


/**
 * Cross-browser function for getting the window of a frame or iframe.
 * @param {HTMLIFrameElement|HTMLFrameElement} frame Frame element.
 * @return {Window} The window associated with the given frame.
 */
goog.dom.getFrameContentWindow = function(frame) {
  return frame.contentWindow ||
      goog.dom.getWindow_(goog.dom.getFrameContentDocument(frame));
};


/**
 * Cross-browser function for setting the text content of an element.
 * @param {Element} element The element to change the text content of.
 * @param {string} text The string that should replace the current element
 *     content.
 */
goog.dom.setTextContent = function(element, text) {
  if ('textContent' in element) {
    element.textContent = text;
  } else if (element.firstChild &&
             element.firstChild.nodeType == goog.dom.NodeType.TEXT) {
    // If the first child is a text node we just change its data and remove the
    // rest of the children.
    while (element.lastChild != element.firstChild) {
      element.removeChild(element.lastChild);
    }
    element.firstChild.data = text;
  } else {
    goog.dom.removeChildren(element);
    var doc = goog.dom.getOwnerDocument(element);
    element.appendChild(doc.createTextNode(text));
  }
};


/**
 * Gets the outerHTML of a node, which islike innerHTML, except that it
 * actually contains the HTML of the node itself.
 * @param {Element} element The element to get the HTML of.
 * @return {string} The outerHTML of the given element.
 */
goog.dom.getOuterHtml = function(element) {
  // IE, Opera and WebKit all have outerHTML.
  if ('outerHTML' in element) {
    return element.outerHTML;
  } else {
    var doc = goog.dom.getOwnerDocument(element);
    var div = doc.createElement('div');
    div.appendChild(element.cloneNode(true));
    return div.innerHTML;
  }
};


/**
 * Finds the first descendant node that matches the filter function, using
 * a depth first search. This function offers the most general purpose way
 * of finding a matching element. You may also wish to consider
 * {@code goog.dom.query} which can express many matching criteria using
 * CSS selector expressions. These expressions often result in a more
 * compact representation of the desired result.
 * @see goog.dom.query
 *
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Node|undefined} The found node or undefined if none is found.
 */
goog.dom.findNode = function(root, p) {
  var rv = [];
  var found = goog.dom.findNodes_(root, p, rv, true);
  return found ? rv[0] : undefined;
};


/**
 * Finds all the descendant nodes that match the filter function, using a
 * a depth first search. This function offers the most general-purpose way
 * of finding a set of matching elements. You may also wish to consider
 * {@code goog.dom.query} which can express many matching criteria using
 * CSS selector expressions. These expressions often result in a more
 * compact representation of the desired result.

 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {!Array.<!Node>} The found nodes or an empty array if none are found.
 */
goog.dom.findNodes = function(root, p) {
  var rv = [];
  goog.dom.findNodes_(root, p, rv, false);
  return rv;
};


/**
 * Finds the first or all the descendant nodes that match the filter function,
 * using a depth first search.
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @param {!Array.<!Node>} rv The found nodes are added to this array.
 * @param {boolean} findOne If true we exit after the first found node.
 * @return {boolean} Whether the search is complete or not. True in case findOne
 *     is true and the node is found. False otherwise.
 * @private
 */
goog.dom.findNodes_ = function(root, p, rv, findOne) {
  if (root != null) {
    var child = root.firstChild;
    while (child) {
      if (p(child)) {
        rv.push(child);
        if (findOne) {
          return true;
        }
      }
      if (goog.dom.findNodes_(child, p, rv, findOne)) {
        return true;
      }
      child = child.nextSibling;
    }
  }
  return false;
};


/**
 * Map of tags whose content to ignore when calculating text length.
 * @type {Object}
 * @private
 */
goog.dom.TAGS_TO_IGNORE_ = {
  'SCRIPT': 1,
  'STYLE': 1,
  'HEAD': 1,
  'IFRAME': 1,
  'OBJECT': 1
};


/**
 * Map of tags which have predefined values with regard to whitespace.
 * @type {Object}
 * @private
 */
goog.dom.PREDEFINED_TAG_VALUES_ = {'IMG': ' ', 'BR': '\n'};


/**
 * Returns true if the element has a tab index that allows it to receive
 * keyboard focus (tabIndex >= 0), false otherwise.  Note that form elements
 * natively support keyboard focus, even if they have no tab index.
 * @param {Element} element Element to check.
 * @return {boolean} Whether the element has a tab index that allows keyboard
 *     focus.
 * @see http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
 */
goog.dom.isFocusableTabIndex = function(element) {
  // IE returns 0 for an unset tabIndex, so we must use getAttributeNode(),
  // which returns an object with a 'specified' property if tabIndex is
  // specified.  This works on other browsers, too.
  var attrNode = element.getAttributeNode('tabindex'); // Must be lowercase!
  if (attrNode && attrNode.specified) {
    var index = element.tabIndex;
    // NOTE: IE9 puts tabIndex in 16-bit int, e.g. -2 is 65534.
    return goog.isNumber(index) && index >= 0 && index < 32768;
  }
  return false;
};


/**
 * Enables or disables keyboard focus support on the element via its tab index.
 * Only elements for which {@link goog.dom.isFocusableTabIndex} returns true
 * (or elements that natively support keyboard focus, like form elements) can
 * receive keyboard focus.  See http://go/tabindex for more info.
 * @param {Element} element Element whose tab index is to be changed.
 * @param {boolean} enable Whether to set or remove a tab index on the element
 *     that supports keyboard focus.
 */
goog.dom.setFocusableTabIndex = function(element, enable) {
  if (enable) {
    element.tabIndex = 0;
  } else {
    // Set tabIndex to -1 first, then remove it. This is a workaround for
    // Safari (confirmed in version 4 on Windows). When removing the attribute
    // without setting it to -1 first, the element remains keyboard focusable
    // despite not having a tabIndex attribute anymore.
    element.tabIndex = -1;
    element.removeAttribute('tabIndex'); // Must be camelCase!
  }
};


/**
 * Returns the text content of the current node, without markup and invisible
 * symbols. New lines are stripped and whitespace is collapsed,
 * such that each character would be visible.
 *
 * In browsers that support it, innerText is used.  Other browsers attempt to
 * simulate it via node traversal.  Line breaks are canonicalized in IE.
 *
 * @param {Node} node The node from which we are getting content.
 * @return {string} The text content.
 */
goog.dom.getTextContent = function(node) {
  var textContent;
  // Note(arv): IE9, Opera, and Safari 3 support innerText but they include
  // text nodes in script tags. So we revert to use a user agent test here.
  if (goog.dom.BrowserFeature.CAN_USE_INNER_TEXT && ('innerText' in node)) {
    textContent = goog.string.canonicalizeNewlines(node.innerText);
    // Unfortunately .innerText() returns text with &shy; symbols
    // We need to filter it out and then remove duplicate whitespaces
  } else {
    var buf = [];
    goog.dom.getTextContent_(node, buf, true);
    textContent = buf.join('');
  }

  // Strip &shy; entities. goog.format.insertWordBreaks inserts them in Opera.
  textContent = textContent.replace(/ \xAD /g, ' ').replace(/\xAD/g, '');
  // Strip &#8203; entities. goog.format.insertWordBreaks inserts them in IE8.
  textContent = textContent.replace(/\u200B/g, '');

  // Skip this replacement on old browsers with working innerText, which
  // automatically turns &nbsp; into ' ' and / +/ into ' ' when reading
  // innerText.
  if (!goog.dom.BrowserFeature.CAN_USE_INNER_TEXT) {
    textContent = textContent.replace(/ +/g, ' ');
  }
  if (textContent != ' ') {
    textContent = textContent.replace(/^\s*/, '');
  }

  return textContent;
};


/**
 * Returns the text content of the current node, without markup.
 *
 * Unlike {@code getTextContent} this method does not collapse whitespaces
 * or normalize lines breaks.
 *
 * @param {Node} node The node from which we are getting content.
 * @return {string} The raw text content.
 */
goog.dom.getRawTextContent = function(node) {
  var buf = [];
  goog.dom.getTextContent_(node, buf, false);

  return buf.join('');
};


/**
 * Recursive support function for text content retrieval.
 *
 * @param {Node} node The node from which we are getting content.
 * @param {Array} buf string buffer.
 * @param {boolean} normalizeWhitespace Whether to normalize whitespace.
 * @private
 */
goog.dom.getTextContent_ = function(node, buf, normalizeWhitespace) {
  if (node.nodeName in goog.dom.TAGS_TO_IGNORE_) {
    // ignore certain tags
  } else if (node.nodeType == goog.dom.NodeType.TEXT) {
    if (normalizeWhitespace) {
      buf.push(String(node.nodeValue).replace(/(\r\n|\r|\n)/g, ''));
    } else {
      buf.push(node.nodeValue);
    }
  } else if (node.nodeName in goog.dom.PREDEFINED_TAG_VALUES_) {
    buf.push(goog.dom.PREDEFINED_TAG_VALUES_[node.nodeName]);
  } else {
    var child = node.firstChild;
    while (child) {
      goog.dom.getTextContent_(child, buf, normalizeWhitespace);
      child = child.nextSibling;
    }
  }
};


/**
 * Returns the text length of the text contained in a node, without markup. This
 * is equivalent to the selection length if the node was selected, or the number
 * of cursor movements to traverse the node. Images & BRs take one space.  New
 * lines are ignored.
 *
 * @param {Node} node The node whose text content length is being calculated.
 * @return {number} The length of {@code node}'s text content.
 */
goog.dom.getNodeTextLength = function(node) {
  return goog.dom.getTextContent(node).length;
};


/**
 * Returns the text offset of a node relative to one of its ancestors. The text
 * length is the same as the length calculated by goog.dom.getNodeTextLength.
 *
 * @param {Node} node The node whose offset is being calculated.
 * @param {Node=} opt_offsetParent The node relative to which the offset will
 *     be calculated. Defaults to the node's owner document's body.
 * @return {number} The text offset.
 */
goog.dom.getNodeTextOffset = function(node, opt_offsetParent) {
  var root = opt_offsetParent || goog.dom.getOwnerDocument(node).body;
  var buf = [];
  while (node && node != root) {
    var cur = node;
    while ((cur = cur.previousSibling)) {
      buf.unshift(goog.dom.getTextContent(cur));
    }
    node = node.parentNode;
  }
  // Trim left to deal with FF cases when there might be line breaks and empty
  // nodes at the front of the text
  return goog.string.trimLeft(buf.join('')).replace(/ +/g, ' ').length;
};


/**
 * Returns the node at a given offset in a parent node.  If an object is
 * provided for the optional third parameter, the node and the remainder of the
 * offset will stored as properties of this object.
 * @param {Node} parent The parent node.
 * @param {number} offset The offset into the parent node.
 * @param {Object=} opt_result Object to be used to store the return value. The
 *     return value will be stored in the form {node: Node, remainder: number}
 *     if this object is provided.
 * @return {Node} The node at the given offset.
 */
goog.dom.getNodeAtOffset = function(parent, offset, opt_result) {
  var stack = [parent], pos = 0, cur;
  while (stack.length > 0 && pos < offset) {
    cur = stack.pop();
    if (cur.nodeName in goog.dom.TAGS_TO_IGNORE_) {
      // ignore certain tags
    } else if (cur.nodeType == goog.dom.NodeType.TEXT) {
      var text = cur.nodeValue.replace(/(\r\n|\r|\n)/g, '').replace(/ +/g, ' ');
      pos += text.length;
    } else if (cur.nodeName in goog.dom.PREDEFINED_TAG_VALUES_) {
      pos += goog.dom.PREDEFINED_TAG_VALUES_[cur.nodeName].length;
    } else {
      for (var i = cur.childNodes.length - 1; i >= 0; i--) {
        stack.push(cur.childNodes[i]);
      }
    }
  }
  if (goog.isObject(opt_result)) {
    opt_result.remainder = cur ? cur.nodeValue.length + offset - pos - 1 : 0;
    opt_result.node = cur;
  }

  return cur;
};


/**
 * Returns true if the object is a {@code NodeList}.  To qualify as a NodeList,
 * the object must have a numeric length property and an item function (which
 * has type 'string' on IE for some reason).
 * @param {Object} val Object to test.
 * @return {boolean} Whether the object is a NodeList.
 */
goog.dom.isNodeList = function(val) {
  // TODO(attila): Now the isNodeList is part of goog.dom we can use
  // goog.userAgent to make this simpler.
  // A NodeList must have a length property of type 'number' on all platforms.
  if (val && typeof val.length == 'number') {
    // A NodeList is an object everywhere except Safari, where it's a function.
    if (goog.isObject(val)) {
      // A NodeList must have an item function (on non-IE platforms) or an item
      // property of type 'string' (on IE).
      return typeof val.item == 'function' || typeof val.item == 'string';
    } else if (goog.isFunction(val)) {
      // On Safari, a NodeList is a function with an item property that is also
      // a function.
      return typeof val.item == 'function';
    }
  }

  // Not a NodeList.
  return false;
};


/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * tag name and/or class name. If the passed element matches the specified
 * criteria, the element itself is returned.
 * @param {Node} element The DOM node to start with.
 * @param {?(goog.dom.TagName|string)=} opt_tag The tag name to match (or
 *     null/undefined to match only based on class name).
 * @param {?string=} opt_class The class name to match (or null/undefined to
 *     match only based on tag name).
 * @return {Element} The first ancestor that matches the passed criteria, or
 *     null if no match is found.
 */
goog.dom.getAncestorByTagNameAndClass = function(element, opt_tag, opt_class) {
  if (!opt_tag && !opt_class) {
    return null;
  }
  var tagName = opt_tag ? opt_tag.toUpperCase() : null;
  return /** @type {Element} */ (goog.dom.getAncestor(element,
      function(node) {
        return (!tagName || node.nodeName == tagName) &&
               (!opt_class || goog.dom.classes.has(node, opt_class));
      }, true));
};


/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * class name. If the passed element matches the specified criteria, the
 * element itself is returned.
 * @param {Node} element The DOM node to start with.
 * @param {string} className The class name to match.
 * @return {Element} The first ancestor that matches the passed criteria, or
 *     null if none match.
 */
goog.dom.getAncestorByClass = function(element, className) {
  return goog.dom.getAncestorByTagNameAndClass(element, null, className);
};


/**
 * Walks up the DOM hierarchy returning the first ancestor that passes the
 * matcher function.
 * @param {Node} element The DOM node to start with.
 * @param {function(Node) : boolean} matcher A function that returns true if the
 *     passed node matches the desired criteria.
 * @param {boolean=} opt_includeNode If true, the node itself is included in
 *     the search (the first call to the matcher will pass startElement as
 *     the node to test).
 * @param {number=} opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return {Node} DOM node that matched the matcher, or null if there was
 *     no match.
 */
goog.dom.getAncestor = function(
    element, matcher, opt_includeNode, opt_maxSearchSteps) {
  if (!opt_includeNode) {
    element = element.parentNode;
  }
  var ignoreSearchSteps = opt_maxSearchSteps == null;
  var steps = 0;
  while (element && (ignoreSearchSteps || steps <= opt_maxSearchSteps)) {
    if (matcher(element)) {
      return element;
    }
    element = element.parentNode;
    steps++;
  }
  // Reached the root of the DOM without a match
  return null;
};


/**
 * Determines the active element in the given document.
 * @param {Document} doc The document to look in.
 * @return {Element} The active element.
 */
goog.dom.getActiveElement = function(doc) {
  try {
    return doc && doc.activeElement;
  } catch (e) {
    // NOTE(nicksantos): Sometimes, evaluating document.activeElement in IE
    // throws an exception. I'm not 100% sure why, but I suspect it chokes
    // on document.activeElement if the activeElement has been recently
    // removed from the DOM by a JS operation.
    //
    // We assume that an exception here simply means
    // "there is no active element."
  }

  return null;
};



/**
 * Create an instance of a DOM helper with a new document object.
 * @param {Document=} opt_document Document object to associate with this
 *     DOM helper.
 * @constructor
 */
goog.dom.DomHelper = function(opt_document) {
  /**
   * Reference to the document object to use
   * @type {!Document}
   * @private
   */
  this.document_ = opt_document || goog.global.document || document;
};


/**
 * Gets the dom helper object for the document where the element resides.
 * @param {Node=} opt_node If present, gets the DomHelper for this node.
 * @return {!goog.dom.DomHelper} The DomHelper.
 */
goog.dom.DomHelper.prototype.getDomHelper = goog.dom.getDomHelper;


/**
 * Sets the document object.
 * @param {!Document} document Document object.
 */
goog.dom.DomHelper.prototype.setDocument = function(document) {
  this.document_ = document;
};


/**
 * Gets the document object being used by the dom library.
 * @return {!Document} Document object.
 */
goog.dom.DomHelper.prototype.getDocument = function() {
  return this.document_;
};


/**
 * Alias for {@code getElementById}. If a DOM node is passed in then we just
 * return that.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 */
goog.dom.DomHelper.prototype.getElement = function(element) {
  if (goog.isString(element)) {
    return this.document_.getElementById(element);
  } else {
    return element;
  }
};


/**
 * Alias for {@code getElement}.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 * @deprecated Use {@link goog.dom.DomHelper.prototype.getElement} instead.
 */
goog.dom.DomHelper.prototype.$ = goog.dom.DomHelper.prototype.getElement;


/**
 * Looks up elements by both tag and class name, using browser native functions
 * ({@code querySelectorAll}, {@code getElementsByTagName} or
 * {@code getElementsByClassName}) where possible. The returned array is a live
 * NodeList or a static list depending on the code path taken.
 *
 * @see goog.dom.query
 *
 * @param {?string=} opt_tag Element tag name or * for all tags.
 * @param {?string=} opt_class Optional class name.
 * @param {(Document|Element)=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.DomHelper.prototype.getElementsByTagNameAndClass = function(opt_tag,
                                                                     opt_class,
                                                                     opt_el) {
  return goog.dom.getElementsByTagNameAndClass_(this.document_, opt_tag,
                                                opt_class, opt_el);
};


/**
 * Returns an array of all the elements with the provided className.
 * @see {goog.dom.query}
 * @param {string} className the name of the class to look for.
 * @param {Element|Document=} opt_el Optional element to look in.
 * @return { {length: number} } The items found with the class name provided.
 */
goog.dom.DomHelper.prototype.getElementsByClass = function(className, opt_el) {
  var doc = opt_el || this.document_;
  return goog.dom.getElementsByClass(className, doc);
};


/**
 * Returns the first element we find matching the provided class name.
 * @see {goog.dom.query}
 * @param {string} className the name of the class to look for.
 * @param {(Element|Document)=} opt_el Optional element to look in.
 * @return {Element} The first item found with the class name provided.
 */
goog.dom.DomHelper.prototype.getElementByClass = function(className, opt_el) {
  var doc = opt_el || this.document_;
  return goog.dom.getElementByClass(className, doc);
};


/**
 * Alias for {@code getElementsByTagNameAndClass}.
 * @deprecated Use DomHelper getElementsByTagNameAndClass.
 * @see goog.dom.query
 *
 * @param {?string=} opt_tag Element tag name.
 * @param {?string=} opt_class Optional class name.
 * @param {Element=} opt_el Optional element to look in.
 * @return { {length: number} } Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.DomHelper.prototype.$$ =
    goog.dom.DomHelper.prototype.getElementsByTagNameAndClass;


/**
 * Sets a number of properties on a node.
 * @param {Element} element DOM node to set properties on.
 * @param {Object} properties Hash of property:value pairs.
 */
goog.dom.DomHelper.prototype.setProperties = goog.dom.setProperties;


/**
 * Gets the dimensions of the viewport.
 * @param {Window=} opt_window Optional window element to test. Defaults to
 *     the window of the Dom Helper.
 * @return {!goog.math.Size} Object with values 'width' and 'height'.
 */
goog.dom.DomHelper.prototype.getViewportSize = function(opt_window) {
  // TODO(arv): This should not take an argument. That breaks the rule of a
  // a DomHelper representing a single frame/window/document.
  return goog.dom.getViewportSize(opt_window || this.getWindow());
};


/**
 * Calculates the height of the document.
 *
 * @return {number} The height of the document.
 */
goog.dom.DomHelper.prototype.getDocumentHeight = function() {
  return goog.dom.getDocumentHeight_(this.getWindow());
};


/**
 * Typedef for use with goog.dom.createDom and goog.dom.append.
 * @typedef {Object|string|Array|NodeList}
 */
goog.dom.Appendable;


/**
 * Returns a dom node with a set of attributes.  This function accepts varargs
 * for subsequent nodes to be added.  Subsequent nodes will be added to the
 * first node as childNodes.
 *
 * So:
 * <code>createDom('div', null, createDom('p'), createDom('p'));</code>
 * would return a div with two child paragraphs
 *
 * An easy way to move all child nodes of an existing element to a new parent
 * element is:
 * <code>createDom('div', null, oldElement.childNodes);</code>
 * which will remove all child nodes from the old element and add them as
 * child nodes of the new DIV.
 *
 * @param {string} tagName Tag to create.
 * @param {Object|string=} opt_attributes If object, then a map of name-value
 *     pairs for attributes. If a string, then this is the className of the new
 *     element.
 * @param {...goog.dom.Appendable} var_args Further DOM nodes or
 *     strings for text nodes. If one of the var_args is an array or
 *     NodeList, its elements will be added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 */
goog.dom.DomHelper.prototype.createDom = function(tagName,
                                                  opt_attributes,
                                                  var_args) {
  return goog.dom.createDom_(this.document_, arguments);
};


/**
 * Alias for {@code createDom}.
 * @param {string} tagName Tag to create.
 * @param {(Object|string)=} opt_attributes If object, then a map of name-value
 *     pairs for attributes. If a string, then this is the className of the new
 *     element.
 * @param {...goog.dom.Appendable} var_args Further DOM nodes or strings for
 *     text nodes.  If one of the var_args is an array, its children will be
 *     added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 * @deprecated Use {@link goog.dom.DomHelper.prototype.createDom} instead.
 */
goog.dom.DomHelper.prototype.$dom = goog.dom.DomHelper.prototype.createDom;


/**
 * Creates a new element.
 * @param {string} name Tag name.
 * @return {!Element} The new element.
 */
goog.dom.DomHelper.prototype.createElement = function(name) {
  return this.document_.createElement(name);
};


/**
 * Creates a new text node.
 * @param {string} content Content.
 * @return {!Text} The new text node.
 */
goog.dom.DomHelper.prototype.createTextNode = function(content) {
  return this.document_.createTextNode(content);
};


/**
 * Create a table.
 * @param {number} rows The number of rows in the table.  Must be >= 1.
 * @param {number} columns The number of columns in the table.  Must be >= 1.
 * @param {boolean=} opt_fillWithNbsp If true, fills table entries with nsbps.
 * @return {!Element} The created table.
 */
goog.dom.DomHelper.prototype.createTable = function(rows, columns,
    opt_fillWithNbsp) {
  return goog.dom.createTable_(this.document_, rows, columns,
      !!opt_fillWithNbsp);
};


/**
 * Converts an HTML string into a node or a document fragment.  A single Node
 * is used if the {@code htmlString} only generates a single node.  If the
 * {@code htmlString} generates multiple nodes then these are put inside a
 * {@code DocumentFragment}.
 *
 * @param {string} htmlString The HTML string to convert.
 * @return {!Node} The resulting node.
 */
goog.dom.DomHelper.prototype.htmlToDocumentFragment = function(htmlString) {
  return goog.dom.htmlToDocumentFragment_(this.document_, htmlString);
};


/**
 * Returns the compatMode of the document.
 * @return {string} The result is either CSS1Compat or BackCompat.
 * @deprecated use goog.dom.DomHelper.prototype.isCss1CompatMode instead.
 */
goog.dom.DomHelper.prototype.getCompatMode = function() {
  return this.isCss1CompatMode() ? 'CSS1Compat' : 'BackCompat';
};


/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @return {boolean} True if in CSS1-compatible mode.
 */
goog.dom.DomHelper.prototype.isCss1CompatMode = function() {
  return goog.dom.isCss1CompatMode_(this.document_);
};


/**
 * Gets the window object associated with the document.
 * @return {!Window} The window associated with the given document.
 */
goog.dom.DomHelper.prototype.getWindow = function() {
  return goog.dom.getWindow_(this.document_);
};


/**
 * Gets the document scroll element.
 * @return {Element} Scrolling element.
 */
goog.dom.DomHelper.prototype.getDocumentScrollElement = function() {
  return goog.dom.getDocumentScrollElement_(this.document_);
};


/**
 * Gets the document scroll distance as a coordinate object.
 * @return {!goog.math.Coordinate} Object with properties 'x' and 'y'.
 */
goog.dom.DomHelper.prototype.getDocumentScroll = function() {
  return goog.dom.getDocumentScroll_(this.document_);
};


/**
 * Appends a child to a node.
 * @param {Node} parent Parent.
 * @param {Node} child Child.
 */
goog.dom.DomHelper.prototype.appendChild = goog.dom.appendChild;


/**
 * Appends a node with text or other nodes.
 * @param {!Node} parent The node to append nodes to.
 * @param {...goog.dom.Appendable} var_args The things to append to the node.
 *     If this is a Node it is appended as is.
 *     If this is a string then a text node is appended.
 *     If this is an array like object then fields 0 to length - 1 are appended.
 */
goog.dom.DomHelper.prototype.append = goog.dom.append;


/**
 * Removes all the child nodes on a DOM node.
 * @param {Node} node Node to remove children from.
 */
goog.dom.DomHelper.prototype.removeChildren = goog.dom.removeChildren;


/**
 * Inserts a new node before an existing reference node (i.e., as the previous
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert before.
 */
goog.dom.DomHelper.prototype.insertSiblingBefore = goog.dom.insertSiblingBefore;


/**
 * Inserts a new node after an existing reference node (i.e., as the next
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert after.
 */
goog.dom.DomHelper.prototype.insertSiblingAfter = goog.dom.insertSiblingAfter;


/**
 * Removes a node from its parent.
 * @param {Node} node The node to remove.
 * @return {Node} The node removed if removed; else, null.
 */
goog.dom.DomHelper.prototype.removeNode = goog.dom.removeNode;


/**
 * Replaces a node in the DOM tree. Will do nothing if {@code oldNode} has no
 * parent.
 * @param {Node} newNode Node to insert.
 * @param {Node} oldNode Node to replace.
 */
goog.dom.DomHelper.prototype.replaceNode = goog.dom.replaceNode;


/**
 * Flattens an element. That is, removes it and replace it with its children.
 * @param {Element} element The element to flatten.
 * @return {Element|undefined} The original element, detached from the document
 *     tree, sans children, or undefined if the element was already not in the
 *     document.
 */
goog.dom.DomHelper.prototype.flattenElement = goog.dom.flattenElement;


/**
 * Returns the first child node that is an element.
 * @param {Node} node The node to get the first child element of.
 * @return {Element} The first child node of {@code node} that is an element.
 */
goog.dom.DomHelper.prototype.getFirstElementChild =
    goog.dom.getFirstElementChild;


/**
 * Returns the last child node that is an element.
 * @param {Node} node The node to get the last child element of.
 * @return {Element} The last child node of {@code node} that is an element.
 */
goog.dom.DomHelper.prototype.getLastElementChild = goog.dom.getLastElementChild;


/**
 * Returns the first next sibling that is an element.
 * @param {Node} node The node to get the next sibling element of.
 * @return {Element} The next sibling of {@code node} that is an element.
 */
goog.dom.DomHelper.prototype.getNextElementSibling =
    goog.dom.getNextElementSibling;


/**
 * Returns the first previous sibling that is an element.
 * @param {Node} node The node to get the previous sibling element of.
 * @return {Element} The first previous sibling of {@code node} that is
 *     an element.
 */
goog.dom.DomHelper.prototype.getPreviousElementSibling =
    goog.dom.getPreviousElementSibling;


/**
 * Returns the next node in source order from the given node.
 * @param {Node} node The node.
 * @return {Node} The next node in the DOM tree, or null if this was the last
 *     node.
 */
goog.dom.DomHelper.prototype.getNextNode =
    goog.dom.getNextNode;


/**
 * Returns the previous node in source order from the given node.
 * @param {Node} node The node.
 * @return {Node} The previous node in the DOM tree, or null if this was the
 *     first node.
 */
goog.dom.DomHelper.prototype.getPreviousNode =
    goog.dom.getPreviousNode;


/**
 * Whether the object looks like a DOM node.
 * @param {*} obj The object being tested for node likeness.
 * @return {boolean} Whether the object looks like a DOM node.
 */
goog.dom.DomHelper.prototype.isNodeLike = goog.dom.isNodeLike;


/**
 * Whether a node contains another node.
 * @param {Node} parent The node that should contain the other node.
 * @param {Node} descendant The node to test presence of.
 * @return {boolean} Whether the parent node contains the descendent node.
 */
goog.dom.DomHelper.prototype.contains = goog.dom.contains;


/**
 * Returns the owner document for a node.
 * @param {Node} node The node to get the document for.
 * @return {!Document} The document owning the node.
 */
goog.dom.DomHelper.prototype.getOwnerDocument = goog.dom.getOwnerDocument;


/**
 * Cross browser function for getting the document element of an iframe.
 * @param {Element} iframe Iframe element.
 * @return {!Document} The frame content document.
 */
goog.dom.DomHelper.prototype.getFrameContentDocument =
    goog.dom.getFrameContentDocument;


/**
 * Cross browser function for getting the window of a frame or iframe.
 * @param {HTMLIFrameElement|HTMLFrameElement} frame Frame element.
 * @return {Window} The window associated with the given frame.
 */
goog.dom.DomHelper.prototype.getFrameContentWindow =
    goog.dom.getFrameContentWindow;


/**
 * Cross browser function for setting the text content of an element.
 * @param {Element} element The element to change the text content of.
 * @param {string} text The string that should replace the current element
 *     content with.
 */
goog.dom.DomHelper.prototype.setTextContent = goog.dom.setTextContent;


/**
 * Finds the first descendant node that matches the filter function. This does
 * a depth first search.
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Node|undefined} The found node or undefined if none is found.
 */
goog.dom.DomHelper.prototype.findNode = goog.dom.findNode;


/**
 * Finds all the descendant nodes that matches the filter function. This does a
 * depth first search.
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Array.<Node>} The found nodes or an empty array if none are found.
 */
goog.dom.DomHelper.prototype.findNodes = goog.dom.findNodes;


/**
 * Returns the text contents of the current node, without markup. New lines are
 * stripped and whitespace is collapsed, such that each character would be
 * visible.
 *
 * In browsers that support it, innerText is used.  Other browsers attempt to
 * simulate it via node traversal.  Line breaks are canonicalized in IE.
 *
 * @param {Node} node The node from which we are getting content.
 * @return {string} The text content.
 */
goog.dom.DomHelper.prototype.getTextContent = goog.dom.getTextContent;


/**
 * Returns the text length of the text contained in a node, without markup. This
 * is equivalent to the selection length if the node was selected, or the number
 * of cursor movements to traverse the node. Images & BRs take one space.  New
 * lines are ignored.
 *
 * @param {Node} node The node whose text content length is being calculated.
 * @return {number} The length of {@code node}'s text content.
 */
goog.dom.DomHelper.prototype.getNodeTextLength = goog.dom.getNodeTextLength;


/**
 * Returns the text offset of a node relative to one of its ancestors. The text
 * length is the same as the length calculated by
 * {@code goog.dom.getNodeTextLength}.
 *
 * @param {Node} node The node whose offset is being calculated.
 * @param {Node=} opt_offsetParent Defaults to the node's owner document's body.
 * @return {number} The text offset.
 */
goog.dom.DomHelper.prototype.getNodeTextOffset = goog.dom.getNodeTextOffset;


/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * tag name and/or class name. If the passed element matches the specified
 * criteria, the element itself is returned.
 * @param {Node} element The DOM node to start with.
 * @param {?(goog.dom.TagName|string)=} opt_tag The tag name to match (or
 *     null/undefined to match only based on class name).
 * @param {?string=} opt_class The class name to match (or null/undefined to
 *     match only based on tag name).
 * @return {Element} The first ancestor that matches the passed criteria, or
 *     null if no match is found.
 */
goog.dom.DomHelper.prototype.getAncestorByTagNameAndClass =
    goog.dom.getAncestorByTagNameAndClass;


/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * class name. If the passed element matches the specified criteria, the
 * element itself is returned.
 * @param {Node} element The DOM node to start with.
 * @param {string} class The class name to match.
 * @return {Element} The first ancestor that matches the passed criteria, or
 *     null if none match.
 */
goog.dom.DomHelper.prototype.getAncestorByClass =
    goog.dom.getAncestorByClass;


/**
 * Walks up the DOM hierarchy returning the first ancestor that passes the
 * matcher function.
 * @param {Node} element The DOM node to start with.
 * @param {function(Node) : boolean} matcher A function that returns true if the
 *     passed node matches the desired criteria.
 * @param {boolean=} opt_includeNode If true, the node itself is included in
 *     the search (the first call to the matcher will pass startElement as
 *     the node to test).
 * @param {number=} opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return {Node} DOM node that matched the matcher, or null if there was
 *     no match.
 */
goog.dom.DomHelper.prototype.getAncestor = goog.dom.getAncestor;
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A global registry for entry points into a program,
 * so that they can be instrumented. Each module should register their
 * entry points with this registry. Designed to be compiled out
 * if no instrumentation is requested.
 *
 * Entry points may be registered before or after a call to
 * goog.debug.entryPointRegistry.monitorAll. If an entry point is registered
 * later, the existing monitor will instrument the new entry point.
 *
 * @author nicksantos@google.com (Nick Santos)
 */

goog.provide('goog.debug.EntryPointMonitor');
goog.provide('goog.debug.entryPointRegistry');

goog.require('goog.asserts');



/**
 * @interface
 */
goog.debug.EntryPointMonitor = function() {};


/**
 * Instruments a function.
 *
 * @param {!Function} fn A function to instrument.
 * @return {!Function} The instrumented function.
 */
goog.debug.EntryPointMonitor.prototype.wrap;


/**
 * Try to remove an instrumentation wrapper created by this monitor.
 * If the function passed to unwrap is not a wrapper created by this
 * monitor, then we will do nothing.
 *
 * Notice that some wrappers may not be unwrappable. For example, if other
 * monitors have applied their own wrappers, then it will be impossible to
 * unwrap them because their wrappers will have captured our wrapper.
 *
 * So it is important that entry points are unwrapped in the reverse
 * order that they were wrapped.
 *
 * @param {!Function} fn A function to unwrap.
 * @return {!Function} The unwrapped function, or {@code fn} if it was not
 *     a wrapped function created by this monitor.
 */
goog.debug.EntryPointMonitor.prototype.unwrap;


/**
 * An array of entry point callbacks.
 * @type {!Array.<function(!Function)>}
 * @private
 */
goog.debug.entryPointRegistry.refList_ = [];


/**
 * Monitors that should wrap all the entry points.
 * @type {!Array.<!goog.debug.EntryPointMonitor>}
 * @private
 */
goog.debug.entryPointRegistry.monitors_ = [];


/**
 * Whether goog.debug.entryPointRegistry.monitorAll has ever been called.
 * Checking this allows the compiler to optimize out the registrations.
 * @type {boolean}
 * @private
 */
goog.debug.entryPointRegistry.monitorsMayExist_ = false;


/**
 * Register an entry point with this module.
 *
 * The entry point will be instrumented when a monitor is passed to
 * goog.debug.entryPointRegistry.monitorAll. If this has already occurred, the
 * entry point is instrumented immediately.
 *
 * @param {function(!Function)} callback A callback function which is called
 *     with a transforming function to instrument the entry point. The callback
 *     is responsible for wrapping the relevant entry point with the
 *     transforming function.
 */
goog.debug.entryPointRegistry.register = function(callback) {
  // Don't use push(), so that this can be compiled out.
  goog.debug.entryPointRegistry.refList_[
      goog.debug.entryPointRegistry.refList_.length] = callback;
  // If no one calls monitorAll, this can be compiled out.
  if (goog.debug.entryPointRegistry.monitorsMayExist_) {
    var monitors = goog.debug.entryPointRegistry.monitors_;
    for (var i = 0; i < monitors.length; i++) {
      callback(goog.bind(monitors[i].wrap, monitors[i]));
    }
  }
};


/**
 * Configures a monitor to wrap all entry points.
 *
 * Entry points that have already been registered are immediately wrapped by
 * the monitor. When an entry point is registered in the future, it will also
 * be wrapped by the monitor when it is registered.
 *
 * @param {!goog.debug.EntryPointMonitor} monitor An entry point monitor.
 */
goog.debug.entryPointRegistry.monitorAll = function(monitor) {
  goog.debug.entryPointRegistry.monitorsMayExist_ = true;
  var transformer = goog.bind(monitor.wrap, monitor);
  for (var i = 0; i < goog.debug.entryPointRegistry.refList_.length; i++) {
    goog.debug.entryPointRegistry.refList_[i](transformer);
  }
  goog.debug.entryPointRegistry.monitors_.push(monitor);
};


/**
 * Try to unmonitor all the entry points that have already been registered. If
 * an entry point is registered in the future, it will not be wrapped by the
 * monitor when it is registered. Note that this may fail if the entry points
 * have additional wrapping.
 *
 * @param {!goog.debug.EntryPointMonitor} monitor The last monitor to wrap
 *     the entry points.
 * @throws {Error} If the monitor is not the most recently configured monitor.
 */
goog.debug.entryPointRegistry.unmonitorAllIfPossible = function(monitor) {
  var monitors = goog.debug.entryPointRegistry.monitors_;
  goog.asserts.assert(monitor == monitors[monitors.length - 1],
      'Only the most recent monitor can be unwrapped.');
  var transformer = goog.bind(monitor.unwrap, monitor);
  for (var i = 0; i < goog.debug.entryPointRegistry.refList_.length; i++) {
    goog.debug.entryPointRegistry.refList_[i](transformer);
  }
  monitors.length--;
};
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview File which defines dummy object to work around undefined
 * properties compiler warning for weak dependencies on
 * {@link goog.debug.ErrorHandler#protectEntryPoint}.
 *
 */

goog.provide('goog.debug.errorHandlerWeakDep');


/**
 * Dummy object to work around undefined properties compiler warning.
 * @type {Object}
 */
goog.debug.errorHandlerWeakDep = {
  /**
   * @param {Function} fn An entry point function to be protected.
   * @param {boolean=} opt_tracers Whether to install tracers around the
   *     fn.
   * @return {Function} A protected wrapper function that calls the
   *     entry point function.
   */
  protectEntryPoint: function(fn, opt_tracers) { return fn; }
};
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Browser capability checks for the events package.
 *
 */


goog.provide('goog.events.BrowserFeature');

goog.require('goog.userAgent');


/**
 * Enum of browser capabilities.
 * @enum {boolean}
 */
goog.events.BrowserFeature = {
  /**
   * Whether the button attribute of the event is W3C compliant.  False in
   * Internet Explorer prior to version 9; document-version dependent.
   */
  HAS_W3C_BUTTON: !goog.userAgent.IE || goog.userAgent.isDocumentMode(9),

  /**
   * Whether the browser supports full W3C event model.
   */
  HAS_W3C_EVENT_SUPPORT: !goog.userAgent.IE || goog.userAgent.isDocumentMode(9),

  /**
   * To prevent default in IE7 for certain keydown events we need set the
   * keyCode to -1.
   */
  SET_KEY_CODE_TO_PREVENT_DEFAULT: goog.userAgent.IE &&
      !goog.userAgent.isVersion('8'),

  /**
   * Whether the {@code navigator.onLine} property is supported.
   */
  HAS_NAVIGATOR_ONLINE_PROPERTY: !goog.userAgent.WEBKIT ||
      goog.userAgent.isVersion('528'),

  /**
   * Whether HTML5 network online/offline events are supported.
   */
  HAS_HTML5_NETWORK_EVENT_SUPPORT:
      goog.userAgent.GECKO && goog.userAgent.isVersion('1.9b') ||
      goog.userAgent.IE && goog.userAgent.isVersion('8') ||
      goog.userAgent.OPERA && goog.userAgent.isVersion('9.5') ||
      goog.userAgent.WEBKIT && goog.userAgent.isVersion('528'),

  /**
   * Whether HTML5 network events fire on document.body, or otherwise the
   * window.
   */
  HTML5_NETWORK_EVENTS_FIRE_ON_BODY:
      goog.userAgent.GECKO && !goog.userAgent.isVersion('8') ||
      goog.userAgent.IE && !goog.userAgent.isVersion('9')
};
// Copyright 2011 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Definition of the disposable interface.  A disposable object
 * has a dispose method to to clean up references and resources.
 * @author nnaze@google.com (Nathan Naze)
 */


goog.provide('goog.disposable.IDisposable');



/**
 * Interface for a disposable object.  If a instance requires cleanup
 * (references COM objects, DOM notes, or other disposable objects), it should
 * implement this interface (it may subclass goog.Disposable).
 * @interface
 */
goog.disposable.IDisposable = function() {};


/**
 * Disposes of the object and its resources.
 * @return {void} Nothing.
 */
goog.disposable.IDisposable.prototype.dispose;


/**
 * @return {boolean} Whether the object has been disposed of.
 */
goog.disposable.IDisposable.prototype.isDisposed;
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Implements the disposable interface. The dispose method is used
 * to clean up references and resources.
 * @author arv@google.com (Erik Arvidsson)
 */


goog.provide('goog.Disposable');
goog.provide('goog.dispose');

goog.require('goog.disposable.IDisposable');



/**
 * Class that provides the basic implementation for disposable objects. If your
 * class holds one or more references to COM objects, DOM nodes, or other
 * disposable objects, it should extend this class or implement the disposable
 * interface (defined in goog.disposable.IDisposable).
 * @constructor
 * @implements {goog.disposable.IDisposable}
 */
goog.Disposable = function() {
  if (goog.Disposable.ENABLE_MONITORING) {
    goog.Disposable.instances_[goog.getUid(this)] = this;
  }
};


/**
 * @define {boolean} Whether to enable the monitoring of the goog.Disposable
 *     instances. Switching on the monitoring is only recommended for debugging
 *     because it has a significant impact on performance and memory usage.
 *     If switched off, the monitoring code compiles down to 0 bytes.
 *     The monitoring expects that all disposable objects call the
 *     {@code goog.Disposable} base constructor.
 */
goog.Disposable.ENABLE_MONITORING = false;


/**
 * Maps the unique ID of every undisposed {@code goog.Disposable} object to
 * the object itself.
 * @type {!Object.<number, !goog.Disposable>}
 * @private
 */
goog.Disposable.instances_ = {};


/**
 * @return {!Array.<!goog.Disposable>} All {@code goog.Disposable} objects that
 *     haven't been disposed of.
 */
goog.Disposable.getUndisposedObjects = function() {
  var ret = [];
  for (var id in goog.Disposable.instances_) {
    if (goog.Disposable.instances_.hasOwnProperty(id)) {
      ret.push(goog.Disposable.instances_[Number(id)]);
    }
  }
  return ret;
};


/**
 * Clears the registry of undisposed objects but doesn't dispose of them.
 */
goog.Disposable.clearUndisposedObjects = function() {
  goog.Disposable.instances_ = {};
};


/**
 * Whether the object has been disposed of.
 * @type {boolean}
 * @private
 */
goog.Disposable.prototype.disposed_ = false;


/**
 * Disposables that should be disposed when this object is disposed.
 * @type {Array.<goog.disposable.IDisposable>}
 * @private
 */
goog.Disposable.prototype.dependentDisposables_;


/**
 * @return {boolean} Whether the object has been disposed of.
 */
goog.Disposable.prototype.isDisposed = function() {
  return this.disposed_;
};


/**
 * @return {boolean} Whether the object has been disposed of.
 * @deprecated Use {@link #isDisposed} instead.
 */
goog.Disposable.prototype.getDisposed = goog.Disposable.prototype.isDisposed;


/**
 * Disposes of the object. If the object hasn't already been disposed of, calls
 * {@link #disposeInternal}. Classes that extend {@code goog.Disposable} should
 * override {@link #disposeInternal} in order to delete references to COM
 * objects, DOM nodes, and other disposable objects. Reentrant.
 *
 * @return {void} Nothing.
 */
goog.Disposable.prototype.dispose = function() {
  if (!this.disposed_) {
    // Set disposed_ to true first, in case during the chain of disposal this
    // gets disposed recursively.
    this.disposed_ = true;
    this.disposeInternal();
    if (goog.Disposable.ENABLE_MONITORING) {
      var uid = goog.getUid(this);
      if (!goog.Disposable.instances_.hasOwnProperty(uid)) {
        throw Error(this + ' did not call the goog.Disposable base ' +
            'constructor or was disposed of after a clearUndisposedObjects ' +
            'call');
      }
      delete goog.Disposable.instances_[uid];
    }
  }
};


/**
 * Associates a disposable object with this object so that they will be disposed
 * together.
 * @param {goog.disposable.IDisposable} disposable that will be disposed when
 *     this object is disposed.
 */
goog.Disposable.prototype.registerDisposable = function(disposable) {
  if (!this.dependentDisposables_) {
    this.dependentDisposables_ = [];
  }
  this.dependentDisposables_.push(disposable);
};


/**
 * Deletes or nulls out any references to COM objects, DOM nodes, or other
 * disposable objects. Classes that extend {@code goog.Disposable} should
 * override this method.
 * Not reentrant. To avoid calling it twice, it must only be called from the
 * subclass' {@code disposeInternal} method. Everywhere else the public
 * {@code dispose} method must be used.
 * For example:
 * <pre>
 *   mypackage.MyClass = function() {
 *     goog.base(this);
 *     // Constructor logic specific to MyClass.
 *     ...
 *   };
 *   goog.inherits(mypackage.MyClass, goog.Disposable);
 *
 *   mypackage.MyClass.prototype.disposeInternal = function() {
 *     goog.base(this, 'disposeInternal');
 *     // Dispose logic specific to MyClass.
 *     ...
 *   };
 * </pre>
 * @protected
 */
goog.Disposable.prototype.disposeInternal = function() {
  if (this.dependentDisposables_) {
    goog.disposeAll.apply(null, this.dependentDisposables_);
  }
};


/**
 * Calls {@code dispose} on the argument if it supports it. If obj is not an
 *     object with a dispose() method, this is a no-op.
 * @param {*} obj The object to dispose of.
 */
goog.dispose = function(obj) {
  if (obj && typeof obj.dispose == 'function') {
    obj.dispose();
  }
};


/**
 * Calls {@code dispose} on each member of the list that supports it. (If the
 * member is an ArrayLike, then {@code goog.disposeAll()} will be called
 * recursively on each of its members.) If the member is not an object with a
 * {@code dispose()} method, then it is ignored.
 * @param {...*} var_args The list.
 */
goog.disposeAll = function(var_args) {
  for (var i = 0, len = arguments.length; i < len; ++i) {
    var disposable = arguments[i];
    if (goog.isArrayLike(disposable)) {
      goog.disposeAll.apply(null, disposable);
    } else {
      goog.dispose(disposable);
    }
  }
};
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A base class for event objects.
 *
 */


goog.provide('goog.events.Event');

goog.require('goog.Disposable');



/**
 * A base class for event objects, so that they can support preventDefault and
 * stopPropagation.
 *
 * @param {string} type Event Type.
 * @param {Object=} opt_target Reference to the object that is the target of
 *     this event. It has to implement the {@code EventTarget} interface
 *     declared at {@link http://developer.mozilla.org/en/DOM/EventTarget}.
 * @constructor
 * @extends {goog.Disposable}
 */
goog.events.Event = function(type, opt_target) {
  goog.Disposable.call(this);

  /**
   * Event type.
   * @type {string}
   */
  this.type = type;

  /**
   * Target of the event.
   * @type {Object|undefined}
   */
  this.target = opt_target;

  /**
   * Object that had the listener attached.
   * @type {Object|undefined}
   */
  this.currentTarget = this.target;
};
goog.inherits(goog.events.Event, goog.Disposable);


/** @override */
goog.events.Event.prototype.disposeInternal = function() {
  delete this.type;
  delete this.target;
  delete this.currentTarget;
};


/**
 * Whether to cancel the event in internal capture/bubble processing for IE.
 * @type {boolean}
 * @suppress {underscore} Technically public, but referencing this outside
 *     this package is strongly discouraged.
 */
goog.events.Event.prototype.propagationStopped_ = false;


/**
 * Return value for in internal capture/bubble processing for IE.
 * @type {boolean}
 * @suppress {underscore} Technically public, but referencing this outside
 *     this package is strongly discouraged.
 */
goog.events.Event.prototype.returnValue_ = true;


/**
 * Stops event propagation.
 */
goog.events.Event.prototype.stopPropagation = function() {
  this.propagationStopped_ = true;
};


/**
 * Prevents the default action, for example a link redirecting to a url.
 */
goog.events.Event.prototype.preventDefault = function() {
  this.returnValue_ = false;
};


/**
 * Stops the propagation of the event. It is equivalent to
 * {@code e.stopPropagation()}, but can be used as the callback argument of
 * {@link goog.events.listen} without declaring another function.
 * @param {!goog.events.Event} e An event.
 */
goog.events.Event.stopPropagation = function(e) {
  e.stopPropagation();
};


/**
 * Prevents the default action. It is equivalent to
 * {@code e.preventDefault()}, but can be used as the callback argument of
 * {@link goog.events.listen} without declaring another function.
 * @param {!goog.events.Event} e An event.
 */
goog.events.Event.preventDefault = function(e) {
  e.preventDefault();
};
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Event Types.
 *
 * @author arv@google.com (Erik Arvidsson)
 * @author mirkov@google.com (Mirko Visontai)
 */


goog.provide('goog.events.EventType');

goog.require('goog.userAgent');


/**
 * Constants for event names.
 * @enum {string}
 */
goog.events.EventType = {
  // Mouse events
  CLICK: 'click',
  DBLCLICK: 'dblclick',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEOVER: 'mouseover',
  MOUSEOUT: 'mouseout',
  MOUSEMOVE: 'mousemove',
  SELECTSTART: 'selectstart', // IE, Safari, Chrome

  // Key events
  KEYPRESS: 'keypress',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',

  // Focus
  BLUR: 'blur',
  FOCUS: 'focus',
  DEACTIVATE: 'deactivate', // IE only
  // NOTE: The following two events are not stable in cross-browser usage.
  //     WebKit and Opera implement DOMFocusIn/Out.
  //     IE implements focusin/out.
  //     Gecko implements neither see bug at
  //     https://bugzilla.mozilla.org/show_bug.cgi?id=396927.
  // The DOM Events Level 3 Draft deprecates DOMFocusIn in favor of focusin:
  //     http://dev.w3.org/2006/webapi/DOM-Level-3-Events/html/DOM3-Events.html
  // You can use FOCUS in Capture phase until implementations converge.
  FOCUSIN: goog.userAgent.IE ? 'focusin' : 'DOMFocusIn',
  FOCUSOUT: goog.userAgent.IE ? 'focusout' : 'DOMFocusOut',

  // Forms
  CHANGE: 'change',
  SELECT: 'select',
  SUBMIT: 'submit',
  INPUT: 'input',
  PROPERTYCHANGE: 'propertychange', // IE only

  // Drag and drop
  DRAGSTART: 'dragstart',
  DRAGENTER: 'dragenter',
  DRAGOVER: 'dragover',
  DRAGLEAVE: 'dragleave',
  DROP: 'drop',

  // WebKit touch events.
  TOUCHSTART: 'touchstart',
  TOUCHMOVE: 'touchmove',
  TOUCHEND: 'touchend',
  TOUCHCANCEL: 'touchcancel',

  // Misc
  CONTEXTMENU: 'contextmenu',
  ERROR: 'error',
  HELP: 'help',
  LOAD: 'load',
  LOSECAPTURE: 'losecapture',
  READYSTATECHANGE: 'readystatechange',
  RESIZE: 'resize',
  SCROLL: 'scroll',
  UNLOAD: 'unload',

  // HTML 5 History events
  // See http://www.w3.org/TR/html5/history.html#event-definitions
  HASHCHANGE: 'hashchange',
  PAGEHIDE: 'pagehide',
  PAGESHOW: 'pageshow',
  POPSTATE: 'popstate',

  // Copy and Paste
  // Support is limited. Make sure it works on your favorite browser
  // before using.
  // http://www.quirksmode.org/dom/events/cutcopypaste.html
  COPY: 'copy',
  PASTE: 'paste',
  CUT: 'cut',
  BEFORECOPY: 'beforecopy',
  BEFORECUT: 'beforecut',
  BEFOREPASTE: 'beforepaste',

  // HTML 5 worker events
  MESSAGE: 'message',
  CONNECT: 'connect',

  // CSS transition events. Based on the browser support described at:
  // https://developer.mozilla.org/en/css/css_transitions#Browser_compatibility
  TRANSITIONEND: goog.userAgent.WEBKIT ? 'webkitTransitionEnd' :
      (goog.userAgent.OPERA ? 'oTransitionEnd' : 'transitionend')
};
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Useful compiler idioms.
 *
 */

goog.provide('goog.reflect');


/**
 * Syntax for object literal casts.
 * @see http://go/jscompiler-renaming
 * @see http://code.google.com/p/closure-compiler/wiki/
 *      ExperimentalTypeBasedPropertyRenaming
 *
 * Use this if you have an object literal whose keys need to have the same names
 * as the properties of some class even after they are renamed by the compiler.
 *
 * @param {!Function} type Type to cast to.
 * @param {Object} object Object literal to cast.
 * @return {Object} The object literal.
 */
goog.reflect.object = function(type, object) {
  return object;
};


/**
 * To assert to the compiler that an operation is needed when it would
 * otherwise be stripped. For example:
 * <code>
 *     // Force a layout
 *     goog.reflect.sinkValue(dialog.offsetHeight);
 * </code>
 * @type {!Function}
 */
goog.reflect.sinkValue = function(x) {
  goog.reflect.sinkValue[' '](x);
  return x;
};


/**
 * The compiler should optimize this function away iff no one ever uses
 * goog.reflect.sinkValue.
 */
goog.reflect.sinkValue[' '] = goog.nullFunction;


/**
 * Check if a property can be accessed without throwing an exception.
 * @param {Object} obj The owner of the property.
 * @param {string} prop The property name.
 * @return {boolean} Whether the property is accessible. Will also return true
 *     if obj is null.
 */
goog.reflect.canAccessProperty = function(obj, prop) {
  /** @preserveTry */
  try {
    goog.reflect.sinkValue(obj[prop]);
    return true;
  } catch (e) {}
  return false;
};
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A patched, standardized event object for browser events.
 *
 * <pre>
 * The patched event object contains the following members:
 * - type           {string}    Event type, e.g. 'click'
 * - timestamp      {Date}      A date object for when the event was fired
 * - target         {Object}    The element that actually triggered the event
 * - currentTarget  {Object}    The element the listener is attached to
 * - relatedTarget  {Object}    For mouseover and mouseout, the previous object
 * - offsetX        {number}    X-coordinate relative to target
 * - offsetY        {number}    Y-coordinate relative to target
 * - clientX        {number}    X-coordinate relative to viewport
 * - clientY        {number}    Y-coordinate relative to viewport
 * - screenX        {number}    X-coordinate relative to the edge of the screen
 * - screenY        {number}    Y-coordinate relative to the edge of the screen
 * - button         {number}    Mouse button. Use isButton() to test.
 * - keyCode        {number}    Key-code
 * - ctrlKey        {boolean}   Was ctrl key depressed
 * - altKey         {boolean}   Was alt key depressed
 * - shiftKey       {boolean}   Was shift key depressed
 * - metaKey        {boolean}   Was meta key depressed
 * - state          {Object}    History state object
 *
 * NOTE: The keyCode member contains the raw browser keyCode. For normalized
 * key and character code use {@link goog.events.KeyHandler}.
 * </pre>
 *
 */

goog.provide('goog.events.BrowserEvent');
goog.provide('goog.events.BrowserEvent.MouseButton');

goog.require('goog.events.BrowserFeature');
goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('goog.reflect');
goog.require('goog.userAgent');



/**
 * Accepts a browser event object and creates a patched, cross browser event
 * object.
 * The content of this object will not be initialized if no event object is
 * provided. If this is the case, init() needs to be invoked separately.
 * @param {Event=} opt_e Browser event object.
 * @param {Node=} opt_currentTarget Current target for event.
 * @constructor
 * @extends {goog.events.Event}
 */
goog.events.BrowserEvent = function(opt_e, opt_currentTarget) {
  if (opt_e) {
    this.init(opt_e, opt_currentTarget);
  }
};
goog.inherits(goog.events.BrowserEvent, goog.events.Event);


/**
 * Normalized button constants for the mouse.
 * @enum {number}
 */
goog.events.BrowserEvent.MouseButton = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2
};


/**
 * Static data for mapping mouse buttons.
 * @type {Array.<number>}
 */
goog.events.BrowserEvent.IEButtonMap = [
  1, // LEFT
  4, // MIDDLE
  2  // RIGHT
];


/**
 * Target that fired the event.
 * @override
 * @type {Node}
 */
goog.events.BrowserEvent.prototype.target = null;


/**
 * Node that had the listener attached.
 * @override
 * @type {Node|undefined}
 */
goog.events.BrowserEvent.prototype.currentTarget;


/**
 * For mouseover and mouseout events, the related object for the event.
 * @type {Node}
 */
goog.events.BrowserEvent.prototype.relatedTarget = null;


/**
 * X-coordinate relative to target.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.offsetX = 0;


/**
 * Y-coordinate relative to target.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.offsetY = 0;


/**
 * X-coordinate relative to the window.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.clientX = 0;


/**
 * Y-coordinate relative to the window.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.clientY = 0;


/**
 * X-coordinate relative to the monitor.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.screenX = 0;


/**
 * Y-coordinate relative to the monitor.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.screenY = 0;


/**
 * Which mouse button was pressed.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.button = 0;


/**
 * Keycode of key press.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.keyCode = 0;


/**
 * Keycode of key press.
 * @type {number}
 */
goog.events.BrowserEvent.prototype.charCode = 0;


/**
 * Whether control was pressed at time of event.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.ctrlKey = false;


/**
 * Whether alt was pressed at time of event.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.altKey = false;


/**
 * Whether shift was pressed at time of event.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.shiftKey = false;


/**
 * Whether the meta key was pressed at time of event.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.metaKey = false;


/**
 * History state object, only set for PopState events where it's a copy of the
 * state object provided to pushState or replaceState.
 * @type {Object}
 */
goog.events.BrowserEvent.prototype.state;


/**
 * Whether the default platform modifier key was pressed at time of event.
 * (This is control for all platforms except Mac, where it's Meta.
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.platformModifierKey = false;


/**
 * The browser event object.
 * @type {Event}
 * @private
 */
goog.events.BrowserEvent.prototype.event_ = null;


/**
 * Accepts a browser event object and creates a patched, cross browser event
 * object.
 * @param {Event} e Browser event object.
 * @param {Node=} opt_currentTarget Current target for event.
 */
goog.events.BrowserEvent.prototype.init = function(e, opt_currentTarget) {
  var type = this.type = e.type;
  goog.events.Event.call(this, type);

  // TODO(nicksantos): Change this.target to type EventTarget.
  this.target = /** @type {Node} */ (e.target) || e.srcElement;

  this.currentTarget = opt_currentTarget;

  var relatedTarget = /** @type {Node} */ (e.relatedTarget);
  if (relatedTarget) {
    // There's a bug in FireFox where sometimes, relatedTarget will be a
    // chrome element, and accessing any property of it will get a permission
    // denied exception. See:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=497780
    if (goog.userAgent.GECKO) {
      if (!goog.reflect.canAccessProperty(relatedTarget, 'nodeName')) {
        relatedTarget = null;
      }
    }
    // TODO(arv): Use goog.events.EventType when it has been refactored into its
    // own file.
  } else if (type == goog.events.EventType.MOUSEOVER) {
    relatedTarget = e.fromElement;
  } else if (type == goog.events.EventType.MOUSEOUT) {
    relatedTarget = e.toElement;
  }

  this.relatedTarget = relatedTarget;

  // Webkit emits a lame warning whenever layerX/layerY is accessed.
  // http://code.google.com/p/chromium/issues/detail?id=101733
  this.offsetX = (goog.userAgent.WEBKIT || e.offsetX !== undefined) ?
      e.offsetX : e.layerX;
  this.offsetY = (goog.userAgent.WEBKIT || e.offsetY !== undefined) ?
      e.offsetY : e.layerY;

  this.clientX = e.clientX !== undefined ? e.clientX : e.pageX;
  this.clientY = e.clientY !== undefined ? e.clientY : e.pageY;
  this.screenX = e.screenX || 0;
  this.screenY = e.screenY || 0;

  this.button = e.button;

  this.keyCode = e.keyCode || 0;
  this.charCode = e.charCode || (type == 'keypress' ? e.keyCode : 0);
  this.ctrlKey = e.ctrlKey;
  this.altKey = e.altKey;
  this.shiftKey = e.shiftKey;
  this.metaKey = e.metaKey;
  this.platformModifierKey = goog.userAgent.MAC ? e.metaKey : e.ctrlKey;
  this.state = e.state;
  this.event_ = e;
  delete this.returnValue_;
  delete this.propagationStopped_;
};


/**
 * Tests to see which button was pressed during the event. This is really only
 * useful in IE and Gecko browsers. And in IE, it's only useful for
 * mousedown/mouseup events, because click only fires for the left mouse button.
 *
 * Safari 2 only reports the left button being clicked, and uses the value '1'
 * instead of 0. Opera only reports a mousedown event for the middle button, and
 * no mouse events for the right button. Opera has default behavior for left and
 * middle click that can only be overridden via a configuration setting.
 *
 * There's a nice table of this mess at http://www.unixpapa.com/js/mouse.html.
 *
 * @param {goog.events.BrowserEvent.MouseButton} button The button
 *     to test for.
 * @return {boolean} True if button was pressed.
 */
goog.events.BrowserEvent.prototype.isButton = function(button) {
  if (!goog.events.BrowserFeature.HAS_W3C_BUTTON) {
    if (this.type == 'click') {
      return button == goog.events.BrowserEvent.MouseButton.LEFT;
    } else {
      return !!(this.event_.button &
          goog.events.BrowserEvent.IEButtonMap[button]);
    }
  } else {
    return this.event_.button == button;
  }
};


/**
 * Whether this has an "action"-producing mouse button.
 *
 * By definition, this includes left-click on windows/linux, and left-click
 * without the ctrl key on Macs.
 *
 * @return {boolean} The result.
 */
goog.events.BrowserEvent.prototype.isMouseActionButton = function() {
  // Webkit does not ctrl+click to be a right-click, so we
  // normalize it to behave like Gecko and Opera.
  return this.isButton(goog.events.BrowserEvent.MouseButton.LEFT) &&
      !(goog.userAgent.WEBKIT && goog.userAgent.MAC && this.ctrlKey);
};


/**
 * @override
 */
goog.events.BrowserEvent.prototype.stopPropagation = function() {
  goog.events.BrowserEvent.superClass_.stopPropagation.call(this);
  if (this.event_.stopPropagation) {
    this.event_.stopPropagation();
  } else {
    this.event_.cancelBubble = true;
  }
};


/**
 * @override
 */
goog.events.BrowserEvent.prototype.preventDefault = function() {
  goog.events.BrowserEvent.superClass_.preventDefault.call(this);
  var be = this.event_;
  if (!be.preventDefault) {
    be.returnValue = false;
    if (goog.events.BrowserFeature.SET_KEY_CODE_TO_PREVENT_DEFAULT) {
      /** @preserveTry */
      try {
        // Most keys can be prevented using returnValue. Some special keys
        // require setting the keyCode to -1 as well:
        //
        // In IE7:
        // F3, F5, F10, F11, Ctrl+P, Crtl+O, Ctrl+F (these are taken from IE6)
        //
        // In IE8:
        // Ctrl+P, Crtl+O, Ctrl+F (F1-F12 cannot be stopped through the event)
        //
        // We therefore do this for all function keys as well as when Ctrl key
        // is pressed.
        var VK_F1 = 112;
        var VK_F12 = 123;
        if (be.ctrlKey || be.keyCode >= VK_F1 && be.keyCode <= VK_F12) {
          be.keyCode = -1;
        }
      } catch (ex) {
        // IE throws an 'access denied' exception when trying to change
        // keyCode in some situations (e.g. srcElement is input[type=file],
        // or srcElement is an anchor tag rewritten by parent's innerHTML).
        // Do nothing in this case.
      }
    }
  } else {
    be.preventDefault();
  }
};


/**
 * @return {Event} The underlying browser event object.
 */
goog.events.BrowserEvent.prototype.getBrowserEvent = function() {
  return this.event_;
};


/** @override */
goog.events.BrowserEvent.prototype.disposeInternal = function() {
  goog.events.BrowserEvent.superClass_.disposeInternal.call(this);
  this.event_ = null;
  this.target = null;
  this.currentTarget = null;
  this.relatedTarget = null;
};
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Definition of the goog.events.EventWrapper interface.
 *
 * @author eae@google.com (Emil A Eklund)
 */

goog.provide('goog.events.EventWrapper');



/**
 * Interface for event wrappers.
 * @interface
 */
goog.events.EventWrapper = function() {
};


/**
 * Adds an event listener using the wrapper on a DOM Node or an object that has
 * implemented {@link goog.events.EventTarget}. A listener can only be added
 * once to an object.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean=} opt_capt Whether to fire in capture phase (defaults to
 *     false).
 * @param {Object=} opt_scope Element in whose scope to call the listener.
 * @param {goog.events.EventHandler=} opt_eventHandler Event handler to add
 *     listener to.
 */
goog.events.EventWrapper.prototype.listen = function(src, listener, opt_capt,
    opt_scope, opt_eventHandler) {
};


/**
 * Removes an event listener added using goog.events.EventWrapper.listen.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to remove listener
 *    from.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean=} opt_capt Whether to fire in capture phase (defaults to
 *     false).
 * @param {Object=} opt_scope Element in whose scope to call the listener.
 * @param {goog.events.EventHandler=} opt_eventHandler Event handler to remove
 *     listener from.
 */
goog.events.EventWrapper.prototype.unlisten = function(src, listener, opt_capt,
    opt_scope, opt_eventHandler) {
};
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Listener object.
 * @see ../demos/events.html
 */


/**
 * Namespace for events
 */
goog.provide('goog.events.Listener');



/**
 * Simple class that stores information about a listener
 * @constructor
 */
goog.events.Listener = function() {
};


/**
 * Counter used to create a unique key
 * @type {number}
 * @private
 */
goog.events.Listener.counter_ = 0;


/**
 * Whether the listener is a function or an object that implements handleEvent.
 * @type {boolean}
 * @private
 */
goog.events.Listener.prototype.isFunctionListener_;


/**
 * Call back function or an object with a handleEvent function.
 * @type {Function|Object|null}
 */
goog.events.Listener.prototype.listener;


/**
 * Proxy for callback that passes through {@link goog.events#HandleEvent_}
 * @type {Function}
 */
goog.events.Listener.prototype.proxy;


/**
 * Object or node that callback is listening to
 * @type {Object|goog.events.EventTarget}
 */
goog.events.Listener.prototype.src;


/**
 * Type of event
 * @type {string}
 */
goog.events.Listener.prototype.type;


/**
 * Whether the listener is being called in the capture or bubble phase
 * @type {boolean}
 */
goog.events.Listener.prototype.capture;


/**
 * Optional object whose context to execute the listener in
 * @type {Object|undefined}
 */
goog.events.Listener.prototype.handler;


/**
 * The key of the listener.
 * @type {number}
 */
goog.events.Listener.prototype.key = 0;


/**
 * Whether the listener has been removed.
 * @type {boolean}
 */
goog.events.Listener.prototype.removed = false;


/**
 * Whether to remove the listener after it has been called.
 * @type {boolean}
 */
goog.events.Listener.prototype.callOnce = false;


/**
 * Initializes the listener.
 * @param {Function|Object} listener Callback function, or an object with a
 *     handleEvent function.
 * @param {Function} proxy Wrapper for the listener that patches the event.
 * @param {Object} src Source object for the event.
 * @param {string} type Event type.
 * @param {boolean} capture Whether in capture or bubble phase.
 * @param {Object=} opt_handler Object in whose context to execute the callback.
 */
goog.events.Listener.prototype.init = function(listener, proxy, src, type,
                                               capture, opt_handler) {
  // we do the test of the listener here so that we do  not need to
  // continiously do this inside handleEvent
  if (goog.isFunction(listener)) {
    this.isFunctionListener_ = true;
  } else if (listener && listener.handleEvent &&
      goog.isFunction(listener.handleEvent)) {
    this.isFunctionListener_ = false;
  } else {
    throw Error('Invalid listener argument');
  }

  this.listener = listener;
  this.proxy = proxy;
  this.src = src;
  this.type = type;
  this.capture = !!capture;
  this.handler = opt_handler;
  this.callOnce = false;
  this.key = ++goog.events.Listener.counter_;
  this.removed = false;
};


/**
 * Calls the internal listener
 * @param {Object} eventObject Event object to be passed to listener.
 * @return {boolean} The result of the internal listener call.
 */
goog.events.Listener.prototype.handleEvent = function(eventObject) {
  if (this.isFunctionListener_) {
    return this.listener.call(this.handler || this.src, eventObject);
  }
  return this.listener.handleEvent.call(this.listener, eventObject);
};
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Event Manager.
 *
 * Provides an abstracted interface to the browsers' event
 * systems. This uses an indirect lookup of listener functions to avoid circular
 * references between DOM (in IE) or XPCOM (in Mozilla) objects which leak
 * memory. This makes it easier to write OO Javascript/DOM code.
 *
 * It simulates capture & bubble in Internet Explorer.
 *
 * The listeners will also automagically have their event objects patched, so
 * your handlers don't need to worry about the browser.
 *
 * Example usage:
 * <pre>
 * goog.events.listen(myNode, 'click', function(e) { alert('woo') });
 * goog.events.listen(myNode, 'mouseover', mouseHandler, true);
 * goog.events.unlisten(myNode, 'mouseover', mouseHandler, true);
 * goog.events.removeAll(myNode);
 * goog.events.removeAll();
 * </pre>
 *
 *                                            in IE and event object patching]
 *
 * @supported IE6+, FF1.5+, WebKit, Opera.
 * @see ../demos/events.html
 * @see ../demos/event-propagation.html
 * @see ../demos/stopevent.html
 */


// This uses 3 lookup tables/trees.
// listenerTree_ is a tree of type -> capture -> src uid -> [Listener]
// listeners_ is a map of key -> [Listener]
//
// The key is a field of the Listener. The Listener class also has the type,
// capture and the src so one can always trace back in the tree
//
// sources_: src uid -> [Listener]


goog.provide('goog.events');

goog.require('goog.array');
goog.require('goog.debug.entryPointRegistry');
goog.require('goog.debug.errorHandlerWeakDep');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.BrowserFeature');
goog.require('goog.events.Event');
goog.require('goog.events.EventWrapper');
goog.require('goog.events.Listener');
goog.require('goog.object');
goog.require('goog.userAgent');


/**
 * @define {boolean} Whether to always assume the garbage collector is good.
 * @deprecated This is no longer needed and will be removed once apps are
 * updated.
 */
goog.events.ASSUME_GOOD_GC = false;


/**
 * Container for storing event listeners and their proxies
 * @private
 * @type {Object.<goog.events.Listener>}
 */
goog.events.listeners_ = {};


/**
 * The root of the listener tree
 * @private
 * @type {Object}
 */
goog.events.listenerTree_ = {};


/**
 * Lookup for mapping source UIDs to listeners.
 * @private
 * @type {Object}
 */
goog.events.sources_ = {};


/**
 * String used to prepend to IE event types.  Not a constant so that it is not
 * inlined.
 * @type {string}
 * @private
 */
goog.events.onString_ = 'on';


/**
 * Map of computed on strings for IE event types. Caching this removes an extra
 * object allocation in goog.events.listen which improves IE6 performance.
 * @type {Object}
 * @private
 */
goog.events.onStringMap_ = {};


/**
 * Separator used to split up the various parts of an event key, to help avoid
 * the possibilities of collisions.
 * @type {string}
 * @private
 */
goog.events.keySeparator_ = '_';


/**
 * Adds an event listener for a specific event on a DOM Node or an object that
 * has implemented {@link goog.events.EventTarget}. A listener can only be
 * added once to an object and if it is added again the key for the listener
 * is returned.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {string|Array.<string>} type Event type or array of event types.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean=} opt_capt Whether to fire in capture phase (defaults to
 *     false).
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {?number} Unique key for the listener.
 */
goog.events.listen = function(src, type, listener, opt_capt, opt_handler) {
  if (!type) {
    throw Error('Invalid event type');
  } else if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      goog.events.listen(src, type[i], listener, opt_capt, opt_handler);
    }
    return null;
  } else {
    var capture = !!opt_capt;
    var map = goog.events.listenerTree_;

    if (!(type in map)) {
      map[type] = {count_: 0, remaining_: 0};
    }
    map = map[type];

    if (!(capture in map)) {
      map[capture] = {count_: 0, remaining_: 0};
      map.count_++;
    }
    map = map[capture];

    var srcUid = goog.getUid(src);
    var listenerArray, listenerObj;

    // The remaining_ property is used to be able to short circuit the iteration
    // of the event listeners.
    //
    // Increment the remaining event listeners to call even if this event might
    // already have been fired. At this point we do not know if the event has
    // been fired and it is too expensive to find out. By incrementing it we are
    // guaranteed that we will not skip any event listeners.
    map.remaining_++;

    // Do not use srcUid in map here since that will cast the number to a
    // string which will allocate one string object.
    if (!map[srcUid]) {
      listenerArray = map[srcUid] = [];
      map.count_++;
    } else {
      listenerArray = map[srcUid];
      // Ensure that the listeners do not already contain the current listener
      for (var i = 0; i < listenerArray.length; i++) {
        listenerObj = listenerArray[i];
        if (listenerObj.listener == listener &&
            listenerObj.handler == opt_handler) {

          // If this listener has been removed we should not return its key. It
          // is OK that we create new listenerObj below since the removed one
          // will be cleaned up later.
          if (listenerObj.removed) {
            break;
          }

          // We already have this listener. Return its key.
          return listenerArray[i].key;
        }
      }
    }

    var proxy = goog.events.getProxy();
    proxy.src = src;
    listenerObj = new goog.events.Listener();
    listenerObj.init(listener, proxy, src, type, capture, opt_handler);
    var key = listenerObj.key;
    proxy.key = key;

    listenerArray.push(listenerObj);
    goog.events.listeners_[key] = listenerObj;

    if (!goog.events.sources_[srcUid]) {
      goog.events.sources_[srcUid] = [];
    }
    goog.events.sources_[srcUid].push(listenerObj);


    // Attach the proxy through the browser's API
    if (src.addEventListener) {
      if (src == goog.global || !src.customEvent_) {
        src.addEventListener(type, proxy, capture);
      }
    } else {
      // The else above used to be else if (src.attachEvent) and then there was
      // another else statement that threw an exception warning the developer
      // they made a mistake. This resulted in an extra object allocation in IE6
      // due to a wrapper object that had to be implemented around the element
      // and so was removed.
      src.attachEvent(goog.events.getOnString_(type), proxy);
    }

    return key;
  }
};


/**
 * Helper function for returning a proxy function.
 * @return {Function} A new or reused function object.
 */
goog.events.getProxy = function() {
  var proxyCallbackFunction = goog.events.handleBrowserEvent_;
  // Use a local var f to prevent one allocation.
  var f = goog.events.BrowserFeature.HAS_W3C_EVENT_SUPPORT ?
      function(eventObject) {
        return proxyCallbackFunction.call(f.src, f.key, eventObject);
      } :
      function(eventObject) {
        var v = proxyCallbackFunction.call(f.src, f.key, eventObject);
        // NOTE(user): In IE, we hack in a capture phase. However, if
        // there is inline event handler which tries to prevent default (for
        // example <a href="..." onclick="return false">...</a>) in a
        // descendant element, the prevent default will be overridden
        // by this listener if this listener were to return true. Hence, we
        // return undefined.
        if (!v) return v;
      };
  return f;
};


/**
 * Adds an event listener for a specific event on a DomNode or an object that
 * has implemented {@link goog.events.EventTarget}. After the event has fired
 * the event listener is removed from the target.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {string|Array.<string>} type Event type or array of event types.
 * @param {Function|Object} listener Callback method.
 * @param {boolean=} opt_capt Fire in capture phase?.
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {?number} Unique key for the listener.
 */
goog.events.listenOnce = function(src, type, listener, opt_capt, opt_handler) {
  if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      goog.events.listenOnce(src, type[i], listener, opt_capt, opt_handler);
    }
    return null;
  }

  var key = goog.events.listen(src, type, listener, opt_capt, opt_handler);
  var listenerObj = goog.events.listeners_[key];
  listenerObj.callOnce = true;
  return key;
};


/**
 * Adds an event listener with a specific event wrapper on a DOM Node or an
 * object that has implemented {@link goog.events.EventTarget}. A listener can
 * only be added once to an object.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {goog.events.EventWrapper} wrapper Event wrapper to use.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean=} opt_capt Whether to fire in capture phase (defaults to
 *     false).
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 */
goog.events.listenWithWrapper = function(src, wrapper, listener, opt_capt,
    opt_handler) {
  wrapper.listen(src, listener, opt_capt, opt_handler);
};


/**
 * Removes an event listener which was added with listen().
 *
 * @param {EventTarget|goog.events.EventTarget} src The target to stop
 *     listening to events on.
 * @param {string|Array.<string>} type The name of the event without the 'on'
 *     prefix.
 * @param {Function|Object} listener The listener function to remove.
 * @param {boolean=} opt_capt In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase of the
 *     event.
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {?boolean} indicating whether the listener was there to remove.
 */
goog.events.unlisten = function(src, type, listener, opt_capt, opt_handler) {
  if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      goog.events.unlisten(src, type[i], listener, opt_capt, opt_handler);
    }
    return null;
  }

  var capture = !!opt_capt;

  var listenerArray = goog.events.getListeners_(src, type, capture);
  if (!listenerArray) {
    return false;
  }

  for (var i = 0; i < listenerArray.length; i++) {
    if (listenerArray[i].listener == listener &&
        listenerArray[i].capture == capture &&
        listenerArray[i].handler == opt_handler) {
      return goog.events.unlistenByKey(listenerArray[i].key);
    }
  }

  return false;
};


/**
 * Removes an event listener which was added with listen() by the key
 * returned by listen().
 *
 * @param {?number} key The key returned by listen() for this event listener.
 * @return {boolean} indicating whether the listener was there to remove.
 */
goog.events.unlistenByKey = function(key) {
  // Do not use key in listeners here since that will cast the number to a
  // string which will allocate one string object.
  if (!goog.events.listeners_[key]) {
    return false;
  }
  var listener = goog.events.listeners_[key];

  if (listener.removed) {
    return false;
  }

  var src = listener.src;
  var type = listener.type;
  var proxy = listener.proxy;
  var capture = listener.capture;

  if (src.removeEventListener) {
    // EventTarget calls unlisten so we need to ensure that the source is not
    // an event target to prevent re-entry.
    // TODO(arv): What is this goog.global for? Why would anyone listen to
    // events on the [[Global]] object? Is it supposed to be window? Why would
    // we not want to allow removing event listeners on the window?
    if (src == goog.global || !src.customEvent_) {
      src.removeEventListener(type, proxy, capture);
    }
  } else if (src.detachEvent) {
    src.detachEvent(goog.events.getOnString_(type), proxy);
  }

  var srcUid = goog.getUid(src);
  var listenerArray = goog.events.listenerTree_[type][capture][srcUid];

  // In a perfect implementation we would decrement the remaining_ field here
  // but then we would need to know if the listener has already been fired or
  // not. We therefore skip doing this and in this uncommon case the entire
  // ancestor chain will need to be traversed as before.

  // Remove from sources_
  if (goog.events.sources_[srcUid]) {
    var sourcesArray = goog.events.sources_[srcUid];
    goog.array.remove(sourcesArray, listener);
    if (sourcesArray.length == 0) {
      delete goog.events.sources_[srcUid];
    }
  }

  listener.removed = true;
  listenerArray.needsCleanup_ = true;
  goog.events.cleanUp_(type, capture, srcUid, listenerArray);

  delete goog.events.listeners_[key];

  return true;
};


/**
 * Removes an event listener which was added with listenWithWrapper().
 *
 * @param {EventTarget|goog.events.EventTarget} src The target to stop
 *     listening to events on.
 * @param {goog.events.EventWrapper} wrapper Event wrapper to use.
 * @param {Function|Object} listener The listener function to remove.
 * @param {boolean=} opt_capt In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase of the
 *     event.
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 */
goog.events.unlistenWithWrapper = function(src, wrapper, listener, opt_capt,
    opt_handler) {
  wrapper.unlisten(src, listener, opt_capt, opt_handler);
};


/**
 * Cleans up the listener array as well as the listener tree
 * @param {string} type  The type of the event.
 * @param {boolean} capture Whether to clean up capture phase listeners instead
 *     bubble phase listeners.
 * @param {number} srcUid  The unique ID of the source.
 * @param {Array.<goog.events.Listener>} listenerArray The array being cleaned.
 * @private
 */
goog.events.cleanUp_ = function(type, capture, srcUid, listenerArray) {
  // The listener array gets locked during the dispatch phase so that removals
  // of listeners during this phase does not screw up the indeces. This method
  // is called after we have removed a listener as well as after the dispatch
  // phase in case any listeners were removed.
  if (!listenerArray.locked_) { // catches both 0 and not set
    if (listenerArray.needsCleanup_) {
      // Loop over the listener array and remove listeners that have removed set
      // to true. This could have been done with filter or something similar but
      // we want to change the array in place and we want to minimize
      // allocations. Adding a listener during this phase adds to the end of the
      // array so that works fine as long as the length is rechecked every in
      // iteration.
      for (var oldIndex = 0, newIndex = 0;
           oldIndex < listenerArray.length;
           oldIndex++) {
        if (listenerArray[oldIndex].removed) {
          var proxy = listenerArray[oldIndex].proxy;
          proxy.src = null;
          continue;
        }
        if (oldIndex != newIndex) {
          listenerArray[newIndex] = listenerArray[oldIndex];
        }
        newIndex++;
      }
      listenerArray.length = newIndex;

      listenerArray.needsCleanup_ = false;

      // In case the length is now zero we release the object.
      if (newIndex == 0) {
        delete goog.events.listenerTree_[type][capture][srcUid];
        goog.events.listenerTree_[type][capture].count_--;

        if (goog.events.listenerTree_[type][capture].count_ == 0) {
          delete goog.events.listenerTree_[type][capture];
          goog.events.listenerTree_[type].count_--;
        }

        if (goog.events.listenerTree_[type].count_ == 0) {
          delete goog.events.listenerTree_[type];
        }
      }

    }
  }
};


/**
 * Removes all listeners from an object, if no object is specified it will
 * remove all listeners that have been registered.  You can also optionally
 * remove listeners of a particular type or capture phase.
 *
 * @param {Object=} opt_obj Object to remove listeners from.
 * @param {string=} opt_type Type of event to, default is all types.
 * @param {boolean=} opt_capt Whether to remove the listeners from the capture
 *     or bubble phase.  If unspecified, will remove both.
 * @return {number} Number of listeners removed.
 */
goog.events.removeAll = function(opt_obj, opt_type, opt_capt) {
  var count = 0;

  var noObj = opt_obj == null;
  var noType = opt_type == null;
  var noCapt = opt_capt == null;
  opt_capt = !!opt_capt;

  if (!noObj) {
    var srcUid = goog.getUid(/** @type {Object} */ (opt_obj));
    if (goog.events.sources_[srcUid]) {
      var sourcesArray = goog.events.sources_[srcUid];
      for (var i = sourcesArray.length - 1; i >= 0; i--) {
        var listener = sourcesArray[i];
        if ((noType || opt_type == listener.type) &&
            (noCapt || opt_capt == listener.capture)) {
          goog.events.unlistenByKey(listener.key);
          count++;
        }
      }
    }
  } else {
    // Loop over the sources_ map instead of over the listeners_ since it is
    // smaller which results in fewer allocations.
    goog.object.forEach(goog.events.sources_, function(listeners) {
      for (var i = listeners.length - 1; i >= 0; i--) {
        var listener = listeners[i];
        if ((noType || opt_type == listener.type) &&
            (noCapt || opt_capt == listener.capture)) {
          goog.events.unlistenByKey(listener.key);
          count++;
        }
      }
    });
  }

  return count;
};


/**
 * Gets the listeners for a given object, type and capture phase.
 *
 * @param {Object} obj Object to get listeners for.
 * @param {string} type Event type.
 * @param {boolean} capture Capture phase?.
 * @return {Array.<goog.events.Listener>} Array of listener objects.
 */
goog.events.getListeners = function(obj, type, capture) {
  return goog.events.getListeners_(obj, type, capture) || [];
};


/**
 * Gets the listeners for a given object, type and capture phase.
 *
 * @param {Object} obj Object to get listeners for.
 * @param {?string} type Event type.
 * @param {boolean} capture Capture phase?.
 * @return {Array.<goog.events.Listener>?} Array of listener objects.
 *     Returns null if object has no listeners of that type.
 * @private
 */
goog.events.getListeners_ = function(obj, type, capture) {
  var map = goog.events.listenerTree_;
  if (type in map) {
    map = map[type];
    if (capture in map) {
      map = map[capture];
      var objUid = goog.getUid(obj);
      if (map[objUid]) {
        return map[objUid];
      }
    }
  }

  return null;
};


/**
 * Gets the goog.events.Listener for the event or null if no such listener is
 * in use.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node from which to get
 *     listeners.
 * @param {?string} type The name of the event without the 'on' prefix.
 * @param {Function|Object} listener The listener function to get.
 * @param {boolean=} opt_capt In DOM-compliant browsers, this determines
 *                            whether the listener is fired during the
 *                            capture or bubble phase of the event.
 * @param {Object=} opt_handler Element in whose scope to call the listener.
 * @return {goog.events.Listener?} the found listener or null if not found.
 */
goog.events.getListener = function(src, type, listener, opt_capt, opt_handler) {
  var capture = !!opt_capt;
  var listenerArray = goog.events.getListeners_(src, type, capture);
  if (listenerArray) {
    for (var i = 0; i < listenerArray.length; i++) {
      // If goog.events.unlistenByKey is called during an event dispatch
      // then the listener array won't get cleaned up and there might be
      // 'removed' listeners in the list. Ignore those.
      if (!listenerArray[i].removed &&
          listenerArray[i].listener == listener &&
          listenerArray[i].capture == capture &&
          listenerArray[i].handler == opt_handler) {
        // We already have this listener. Return its key.
        return listenerArray[i];
      }
    }
  }
  return null;
};


/**
 * Returns whether an event target has any active listeners matching the
 * specified signature. If either the type or capture parameters are
 * unspecified, the function will match on the remaining criteria.
 *
 * @param {EventTarget|goog.events.EventTarget} obj Target to get listeners for.
 * @param {string=} opt_type Event type.
 * @param {boolean=} opt_capture Whether to check for capture or bubble-phase
 *     listeners.
 * @return {boolean} Whether an event target has one or more listeners matching
 *     the requested type and/or capture phase.
 */
goog.events.hasListener = function(obj, opt_type, opt_capture) {
  var objUid = goog.getUid(obj);
  var listeners = goog.events.sources_[objUid];

  if (listeners) {
    var hasType = goog.isDef(opt_type);
    var hasCapture = goog.isDef(opt_capture);

    if (hasType && hasCapture) {
      // Lookup in the listener tree whether the specified listener exists.
      var map = goog.events.listenerTree_[opt_type];
      return !!map && !!map[opt_capture] && objUid in map[opt_capture];

    } else if (!(hasType || hasCapture)) {
      // Simple check for whether the event target has any listeners at all.
      return true;

    } else {
      // Iterate through the listeners for the event target to find a match.
      return goog.array.some(listeners, function(listener) {
        return (hasType && listener.type == opt_type) ||
               (hasCapture && listener.capture == opt_capture);
      });
    }
  }

  return false;
};


/**
 * Provides a nice string showing the normalized event objects public members
 * @param {Object} e Event Object.
 * @return {string} String of the public members of the normalized event object.
 */
goog.events.expose = function(e) {
  var str = [];
  for (var key in e) {
    if (e[key] && e[key].id) {
      str.push(key + ' = ' + e[key] + ' (' + e[key].id + ')');
    } else {
      str.push(key + ' = ' + e[key]);
    }
  }
  return str.join('\n');
};


/**
 * Returns a string wth on prepended to the specified type. This is used for IE
 * which expects "on" to be prepended. This function caches the string in order
 * to avoid extra allocations in steady state.
 * @param {string} type Event type strng.
 * @return {string} The type string with 'on' prepended.
 * @private
 */
goog.events.getOnString_ = function(type) {
  if (type in goog.events.onStringMap_) {
    return goog.events.onStringMap_[type];
  }
  return goog.events.onStringMap_[type] = goog.events.onString_ + type;
};


/**
 * Fires an object's listeners of a particular type and phase
 *
 * @param {Object} obj Object whose listeners to call.
 * @param {string} type Event type.
 * @param {boolean} capture Which event phase.
 * @param {Object} eventObject Event object to be passed to listener.
 * @return {boolean} True if all listeners returned true else false.
 */
goog.events.fireListeners = function(obj, type, capture, eventObject) {
  var map = goog.events.listenerTree_;
  if (type in map) {
    map = map[type];
    if (capture in map) {
      return goog.events.fireListeners_(map[capture], obj, type,
                                        capture, eventObject);
    }
  }
  return true;
};


/**
 * Fires an object's listeners of a particular type and phase.
 *
 * @param {Object} map Object with listeners in it.
 * @param {Object} obj Object whose listeners to call.
 * @param {string} type Event type.
 * @param {boolean} capture Which event phase.
 * @param {Object} eventObject Event object to be passed to listener.
 * @return {boolean} True if all listeners returned true else false.
 * @private
 */
goog.events.fireListeners_ = function(map, obj, type, capture, eventObject) {
  var retval = 1;

  var objUid = goog.getUid(obj);
  if (map[objUid]) {
    map.remaining_--;
    var listenerArray = map[objUid];

    // If locked_ is not set (and if already 0) initialize it to 1.
    if (!listenerArray.locked_) {
      listenerArray.locked_ = 1;
    } else {
      listenerArray.locked_++;
    }

    try {
      // Events added in the dispatch phase should not be dispatched in
      // the current dispatch phase. They will be included in the next
      // dispatch phase though.
      var length = listenerArray.length;
      for (var i = 0; i < length; i++) {
        var listener = listenerArray[i];
        // We might not have a listener if the listener was removed.
        if (listener && !listener.removed) {
          retval &=
              goog.events.fireListener(listener, eventObject) !== false;
        }
      }
    } finally {
      listenerArray.locked_--;
      goog.events.cleanUp_(type, capture, objUid, listenerArray);
    }
  }

  return Boolean(retval);
};


/**
 * Fires a listener with a set of arguments
 *
 * @param {goog.events.Listener} listener The listener object to call.
 * @param {Object} eventObject The event object to pass to the listener.
 * @return {boolean} Result of listener.
 */
goog.events.fireListener = function(listener, eventObject) {
  var rv = listener.handleEvent(eventObject);
  if (listener.callOnce) {
    goog.events.unlistenByKey(listener.key);
  }
  return rv;
};


/**
 * Gets the total number of listeners currently in the system.
 * @return {number} Number of listeners.
 */
goog.events.getTotalListenerCount = function() {
  return goog.object.getCount(goog.events.listeners_);
};


/**
 * Dispatches an event (or event like object) and calls all listeners
 * listening for events of this type. The type of the event is decided by the
 * type property on the event object.
 *
 * If any of the listeners returns false OR calls preventDefault then this
 * function will return false.  If one of the capture listeners calls
 * stopPropagation, then the bubble listeners won't fire.
 *
 * @param {goog.events.EventTarget} src  The event target.
 * @param {string|Object|goog.events.Event} e Event object.
 * @return {boolean} If anyone called preventDefault on the event object (or
 *     if any of the handlers returns false) this will also return false.
 *     If there are no handlers, or if all handlers return true, this returns
 *     true.
 */
goog.events.dispatchEvent = function(src, e) {
  var type = e.type || e;
  var map = goog.events.listenerTree_;
  if (!(type in map)) {
    return true;
  }

  // If accepting a string or object, create a custom event object so that
  // preventDefault and stopPropagation work with the event.
  if (goog.isString(e)) {
    e = new goog.events.Event(e, src);
  } else if (!(e instanceof goog.events.Event)) {
    var oldEvent = e;
    e = new goog.events.Event(type, src);
    goog.object.extend(e, oldEvent);
  } else {
    e.target = e.target || src;
  }

  var rv = 1, ancestors;

  map = map[type];
  var hasCapture = true in map;
  var targetsMap;

  if (hasCapture) {
    // Build ancestors now
    ancestors = [];
    for (var parent = src; parent; parent = parent.getParentEventTarget()) {
      ancestors.push(parent);
    }

    targetsMap = map[true];
    targetsMap.remaining_ = targetsMap.count_;

    // Call capture listeners
    for (var i = ancestors.length - 1;
         !e.propagationStopped_ && i >= 0 && targetsMap.remaining_;
         i--) {
      e.currentTarget = ancestors[i];
      rv &= goog.events.fireListeners_(targetsMap, ancestors[i], e.type,
                                       true, e) &&
            e.returnValue_ != false;
    }
  }

  var hasBubble = false in map;
  if (hasBubble) {
    targetsMap = map[false];
    targetsMap.remaining_ = targetsMap.count_;

    if (hasCapture) { // We have the ancestors.

      // Call bubble listeners
      for (var i = 0; !e.propagationStopped_ && i < ancestors.length &&
           targetsMap.remaining_;
           i++) {
        e.currentTarget = ancestors[i];
        rv &= goog.events.fireListeners_(targetsMap, ancestors[i], e.type,
                                         false, e) &&
              e.returnValue_ != false;
      }
    } else {
      // In case we don't have capture we don't have to build up the
      // ancestors array.

      for (var current = src;
           !e.propagationStopped_ && current && targetsMap.remaining_;
           current = current.getParentEventTarget()) {
        e.currentTarget = current;
        rv &= goog.events.fireListeners_(targetsMap, current, e.type,
                                         false, e) &&
              e.returnValue_ != false;
      }
    }
  }

  return Boolean(rv);
};


/**
 * Installs exception protection for the browser event entry point using the
 * given error handler.
 *
 * @param {goog.debug.ErrorHandler} errorHandler Error handler with which to
 *     protect the entry point.
 */
goog.events.protectBrowserEventEntryPoint = function(errorHandler) {
  goog.events.handleBrowserEvent_ = errorHandler.protectEntryPoint(
      goog.events.handleBrowserEvent_);
};


/**
 * Handles an event and dispatches it to the correct listeners. This
 * function is a proxy for the real listener the user specified.
 *
 * @param {number} key Unique key for the listener.
 * @param {Event=} opt_evt Optional event object that gets passed in via the
 *     native event handlers.
 * @return {boolean} Result of the event handler.
 * @this {goog.events.EventTarget|Object} The object or Element that
 *     fired the event.
 * @private
 */
goog.events.handleBrowserEvent_ = function(key, opt_evt) {
  // If the listener isn't there it was probably removed when processing
  // another listener on the same event (e.g. the later listener is
  // not managed by closure so that they are both fired under IE)
  if (!goog.events.listeners_[key]) {
    return true;
  }

  var listener = goog.events.listeners_[key];
  var type = listener.type;
  var map = goog.events.listenerTree_;

  if (!(type in map)) {
    return true;
  }
  map = map[type];
  var retval, targetsMap;
  // Synthesize event propagation if the browser does not support W3C
  // event model.
  if (!goog.events.BrowserFeature.HAS_W3C_EVENT_SUPPORT) {
    var ieEvent = opt_evt ||
        /** @type {Event} */ (goog.getObjectByName('window.event'));

    // Check if we have any capturing event listeners for this type.
    var hasCapture = true in map;
    var hasBubble = false in map;

    if (hasCapture) {
      if (goog.events.isMarkedIeEvent_(ieEvent)) {
        return true;
      }

      goog.events.markIeEvent_(ieEvent);
    }

    var evt = new goog.events.BrowserEvent();
    evt.init(ieEvent, this);

    retval = true;
    try {
      if (hasCapture) {
        var ancestors = [];

        for (var parent = evt.currentTarget;
             parent;
             parent = parent.parentNode) {
          ancestors.push(parent);
        }

        targetsMap = map[true];
        targetsMap.remaining_ = targetsMap.count_;

        // Call capture listeners
        for (var i = ancestors.length - 1;
             !evt.propagationStopped_ && i >= 0 && targetsMap.remaining_;
             i--) {
          evt.currentTarget = ancestors[i];
          retval &= goog.events.fireListeners_(targetsMap, ancestors[i], type,
                                               true, evt);
        }

        if (hasBubble) {
          targetsMap = map[false];
          targetsMap.remaining_ = targetsMap.count_;

          // Call bubble listeners
          for (var i = 0;
               !evt.propagationStopped_ && i < ancestors.length &&
               targetsMap.remaining_;
               i++) {
            evt.currentTarget = ancestors[i];
            retval &= goog.events.fireListeners_(targetsMap, ancestors[i], type,
                                                 false, evt);
          }
        }

      } else {
        // Bubbling, let IE handle the propagation.
        retval = goog.events.fireListener(listener, evt);
      }

    } finally {
      if (ancestors) {
        ancestors.length = 0;
      }
      evt.dispose();
    }
    return retval;
  } // IE

  // Caught a non-IE DOM event. 1 additional argument which is the event object
  var be = new goog.events.BrowserEvent(opt_evt, this);
  try {
    retval = goog.events.fireListener(listener, be);
  } finally {
    be.dispose();
  }
  return retval;
};


/**
 * This is used to mark the IE event object so we do not do the Closure pass
 * twice for a bubbling event.
 * @param {Event} e The IE browser event.
 * @private
 */
goog.events.markIeEvent_ = function(e) {
  // Only the keyCode and the returnValue can be changed. We use keyCode for
  // non keyboard events.
  // event.returnValue is a bit more tricky. It is undefined by default. A
  // boolean false prevents the default action. In a window.onbeforeunload and
  // the returnValue is non undefined it will be alerted. However, we will only
  // modify the returnValue for keyboard events. We can get a problem if non
  // closure events sets the keyCode or the returnValue

  var useReturnValue = false;

  if (e.keyCode == 0) {
    // We cannot change the keyCode in case that srcElement is input[type=file].
    // We could test that that is the case but that would allocate 3 objects.
    // If we use try/catch we will only allocate extra objects in the case of a
    // failure.
    /** @preserveTry */
    try {
      e.keyCode = -1;
      return;
    } catch (ex) {
      useReturnValue = true;
    }
  }

  if (useReturnValue ||
      /** @type {boolean|undefined} */ (e.returnValue) == undefined) {
    e.returnValue = true;
  }
};


/**
 * This is used to check if an IE event has already been handled by the Closure
 * system so we do not do the Closure pass twice for a bubbling event.
 * @param {Event} e  The IE browser event.
 * @return {boolean} True if the event object has been marked.
 * @private
 */
goog.events.isMarkedIeEvent_ = function(e) {
  return e.keyCode < 0 || e.returnValue != undefined;
};


/**
 * Counter to create unique event ids.
 * @type {number}
 * @private
 */
goog.events.uniqueIdCounter_ = 0;


/**
 * Creates a unique event id.
 *
 * @param {string} identifier The identifier.
 * @return {string} A unique identifier.
 */
goog.events.getUniqueId = function(identifier) {
  return identifier + '_' + goog.events.uniqueIdCounter_++;
};


// Register the browser event handler as an entry point, so that
// it can be monitored for exception handling, etc.
goog.debug.entryPointRegistry.register(
    /**
     * @param {function(!Function): !Function} transformer The transforming
     *     function.
     */
    function(transformer) {
      goog.events.handleBrowserEvent_ = transformer(
          goog.events.handleBrowserEvent_);
    });
// Copyright 2005 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Implementation of EventTarget as defined by W3C DOM 2/3.
 *
 * @author arv@google.com (Erik Arvidsson) [Original implementation]
 * @author pupius@google.com (Daniel Pupius) [Port to use goog.events]
 * @see ../demos/eventtarget.html
 */


/**
 * Namespace for events
 */
goog.provide('goog.events.EventTarget');

goog.require('goog.Disposable');
goog.require('goog.events');



/**
 * Inherit from this class to give your object the ability to dispatch events.
 * Note that this class provides event <em>sending</em> behaviour, not event
 * receiving behaviour: your object will be able to broadcast events, and other
 * objects will be able to listen for those events using goog.events.listen().
 *
 * <p>The name "EventTarget" reflects the fact that this class implements the
 * <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html">
 * EventTarget interface</a> as defined by W3C DOM 2/3, with a few differences:
 * <ul>
 * <li>Event objects do not have to implement the Event interface. An object
 *     is treated as an event object if it has a 'type' property.
 * <li>You can use a plain string instead of an event object; an event-like
 *     object will be created with the 'type' set to the string value.
 * </ul>
 *
 * <p>Unless propagation is stopped, an event dispatched by an EventTarget
 * will bubble to the parent returned by <code>getParentEventTarget</code>.
 * To set the parent, call <code>setParentEventTarget</code> or override
 * <code>getParentEventTarget</code> in a subclass.  Subclasses that don't
 * support changing the parent should override the setter to throw an error.
 *
 * <p>Example usage:
 * <pre>
 *   var source = new goog.events.EventTarget();
 *   function handleEvent(event) {
 *     alert('Type: ' + e.type + '\nTarget: ' + e.target);
 *   }
 *   goog.events.listen(source, 'foo', handleEvent);
 *   ...
 *   source.dispatchEvent({type: 'foo'}); // will call handleEvent
 *   // or source.dispatchEvent('foo');
 *   ...
 *   goog.events.unlisten(source, 'foo', handleEvent);
 *
 *   // You can also use the Listener interface:
 *   var listener = {
 *     handleEvent: function(event) {
 *       ...
 *     }
 *   };
 *   goog.events.listen(source, 'bar', listener);
 * </pre>
 *
 * @constructor
 * @extends {goog.Disposable}
 */
goog.events.EventTarget = function() {
  goog.Disposable.call(this);
};
goog.inherits(goog.events.EventTarget, goog.Disposable);


/**
 * Used to tell if an event is a real event in goog.events.listen() so we don't
 * get listen() calling addEventListener() and vice-versa.
 * @type {boolean}
 * @private
 */
goog.events.EventTarget.prototype.customEvent_ = true;


/**
 * Parent event target, used during event bubbling.
 * @type {goog.events.EventTarget?}
 * @private
 */
goog.events.EventTarget.prototype.parentEventTarget_ = null;


/**
 * Returns the parent of this event target to use for bubbling.
 *
 * @return {goog.events.EventTarget} The parent EventTarget or null if there
 * is no parent.
 */
goog.events.EventTarget.prototype.getParentEventTarget = function() {
  return this.parentEventTarget_;
};


/**
 * Sets the parent of this event target to use for bubbling.
 *
 * @param {goog.events.EventTarget?} parent Parent EventTarget (null if none).
 */
goog.events.EventTarget.prototype.setParentEventTarget = function(parent) {
  this.parentEventTarget_ = parent;
};


/**
 * Adds an event listener to the event target. The same handler can only be
 * added once per the type. Even if you add the same handler multiple times
 * using the same type then it will only be called once when the event is
 * dispatched.
 *
 * Supported for legacy but use goog.events.listen(src, type, handler) instead.
 *
 * @param {string} type The type of the event to listen for.
 * @param {Function|Object} handler The function to handle the event. The
 *     handler can also be an object that implements the handleEvent method
 *     which takes the event object as argument.
 * @param {boolean=} opt_capture In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase
 *     of the event.
 * @param {Object=} opt_handlerScope Object in whose scope to call the listener.
 */
goog.events.EventTarget.prototype.addEventListener = function(
    type, handler, opt_capture, opt_handlerScope) {
  goog.events.listen(this, type, handler, opt_capture, opt_handlerScope);
};


/**
 * Removes an event listener from the event target. The handler must be the
 * same object as the one added. If the handler has not been added then
 * nothing is done.
 * @param {string} type The type of the event to listen for.
 * @param {Function|Object} handler The function to handle the event. The
 *     handler can also be an object that implements the handleEvent method
 *     which takes the event object as argument.
 * @param {boolean=} opt_capture In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase
 *     of the event.
 * @param {Object=} opt_handlerScope Object in whose scope to call the listener.
 */
goog.events.EventTarget.prototype.removeEventListener = function(
    type, handler, opt_capture, opt_handlerScope) {
  goog.events.unlisten(this, type, handler, opt_capture, opt_handlerScope);
};


/**
 * Dispatches an event (or event like object) and calls all listeners
 * listening for events of this type. The type of the event is decided by the
 * type property on the event object.
 *
 * If any of the listeners returns false OR calls preventDefault then this
 * function will return false.  If one of the capture listeners calls
 * stopPropagation, then the bubble listeners won't fire.
 *
 * @param {string|Object|goog.events.Event} e Event object.
 * @return {boolean} If anyone called preventDefault on the event object (or
 *     if any of the handlers returns false this will also return false.
 */
goog.events.EventTarget.prototype.dispatchEvent = function(e) {
  return goog.events.dispatchEvent(this, e);
};


/**
 * Unattach listeners from this object.  Classes that extend EventTarget may
 * need to override this method in order to remove references to DOM Elements
 * and additional listeners, it should be something like this:
 * <pre>
 * MyClass.prototype.disposeInternal = function() {
 *   MyClass.superClass_.disposeInternal.call(this);
 *   // Dispose logic for MyClass
 * };
 * </pre>
 * @override
 * @protected
 */
goog.events.EventTarget.prototype.disposeInternal = function() {
  goog.events.EventTarget.superClass_.disposeInternal.call(this);
  goog.events.removeAll(this);
  this.parentEventTarget_ = null;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A timer class to which other classes and objects can
 * listen on.  This is only an abstraction above setInterval.
 *
 * @see ../demos/timers.html
 */

goog.provide('goog.Timer');

goog.require('goog.events.EventTarget');



/**
 * Class for handling timing events.
 *
 * @param {number=} opt_interval Number of ms between ticks (Default: 1ms).
 * @param {Object=} opt_timerObject  An object that has setTimeout, setInterval,
 *     clearTimeout and clearInterval (eg Window).
 * @constructor
 * @extends {goog.events.EventTarget}
 */
goog.Timer = function(opt_interval, opt_timerObject) {
  goog.events.EventTarget.call(this);

  /**
   * Number of ms between ticks
   * @type {number}
   * @private
   */
  this.interval_ = opt_interval || 1;

  /**
   * An object that implements setTimout, setInterval, clearTimeout and
   * clearInterval. We default to the window object. Changing this on
   * goog.Timer.prototype changes the object for all timer instances which can
   * be useful if your environment has some other implementation of timers than
   * the window object.
   * @type {Object}
   * @private
   */
  this.timerObject_ = opt_timerObject || goog.Timer.defaultTimerObject;

  /**
   * Cached tick_ bound to the object for later use in the timer.
   * @type {Function}
   * @private
   */
  this.boundTick_ = goog.bind(this.tick_, this);

 /**
  * Firefox browser often fires the timer event sooner
  * (sometimes MUCH sooner) than the requested timeout. So we
  * compare the time to when the event was last fired, and
  * reschedule if appropriate. See also goog.Timer.intervalScale
  * @type {number}
  * @private
  */
  this.last_ = goog.now();
};
goog.inherits(goog.Timer, goog.events.EventTarget);


/**
 * Maximum timeout value.
 *
 * Timeout values too big to fit into a signed 32-bit integer may cause
 * overflow in FF, Safari, and Chrome, resulting in the timeout being
 * scheduled immediately.  It makes more sense simply not to schedule these
 * timeouts, since 24.8 days is beyond a reasonable expectation for the
 * browser to stay open.
 *
 * @type {number}
 * @private
 */
goog.Timer.MAX_TIMEOUT_ = 2147483647;


/**
 * Whether this timer is enabled
 * @type {boolean}
 */
goog.Timer.prototype.enabled = false;


/**
 * An object that implements setTimout, setInterval, clearTimeout and
 * clearInterval. We default to the window object. Changing this on
 * goog.Timer.prototype changes the object for all timer instances which can be
 * useful if your environment has some other implementation of timers than the
 * window object.
 * @type {Object}
 */
goog.Timer.defaultTimerObject = goog.global['window'];


/**
 * A variable that controls the timer error correction. If the
 * timer is called before the requested interval times
 * intervalScale, which often happens on mozilla, the timer is
 * rescheduled. See also this.last_
 * @type {number}
 */
goog.Timer.intervalScale = 0.8;


/**
 * Variable for storing the result of setInterval
 * @type {?number}
 * @private
 */
goog.Timer.prototype.timer_ = null;


/**
 * Gets the interval of the timer.
 * @return {number} interval Number of ms between ticks.
 */
goog.Timer.prototype.getInterval = function() {
  return this.interval_;
};


/**
 * Sets the interval of the timer.
 * @param {number} interval Number of ms between ticks.
 */
goog.Timer.prototype.setInterval = function(interval) {
  this.interval_ = interval;
  if (this.timer_ && this.enabled) {
    // Stop and then start the timer to reset the interval.
    this.stop();
    this.start();
  } else if (this.timer_) {
    this.stop();
  }
};


/**
 * Callback for the setTimeout used by the timer
 * @private
 */
goog.Timer.prototype.tick_ = function() {
  if (this.enabled) {
    var elapsed = goog.now() - this.last_;
    if (elapsed > 0 &&
        elapsed < this.interval_ * goog.Timer.intervalScale) {
      this.timer_ = this.timerObject_.setTimeout(this.boundTick_,
          this.interval_ - elapsed);
      return;
    }

    this.dispatchTick();
    // The timer could be stopped in the timer event handler.
    if (this.enabled) {
      this.timer_ = this.timerObject_.setTimeout(this.boundTick_,
          this.interval_);
      this.last_ = goog.now();
    }
  }
};


/**
 * Dispatches the TICK event. This is its own method so subclasses can override.
 */
goog.Timer.prototype.dispatchTick = function() {
  this.dispatchEvent(goog.Timer.TICK);
};


/**
 * Starts the timer.
 */
goog.Timer.prototype.start = function() {
  this.enabled = true;

  // If there is no interval already registered, start it now
  if (!this.timer_) {
    // IMPORTANT!
    // window.setInterval in FireFox has a bug - it fires based on
    // absolute time, rather than on relative time. What this means
    // is that if a computer is sleeping/hibernating for 24 hours
    // and the timer interval was configured to fire every 1000ms,
    // then after the PC wakes up the timer will fire, in rapid
    // succession, 3600*24 times.
    // This bug is described here and is already fixed, but it will
    // take time to propagate, so for now I am switching this over
    // to setTimeout logic.
    //     https://bugzilla.mozilla.org/show_bug.cgi?id=376643
    //
    this.timer_ = this.timerObject_.setTimeout(this.boundTick_,
        this.interval_);
    this.last_ = goog.now();
  }
};


/**
 * Stops the timer.
 */
goog.Timer.prototype.stop = function() {
  this.enabled = false;
  if (this.timer_) {
    this.timerObject_.clearTimeout(this.timer_);
    this.timer_ = null;
  }
};


/** @override */
goog.Timer.prototype.disposeInternal = function() {
  goog.Timer.superClass_.disposeInternal.call(this);
  this.stop();
  delete this.timerObject_;
};


/**
 * Constant for the timer's event type
 * @type {string}
 */
goog.Timer.TICK = 'tick';


/**
 * Calls the given function once, after the optional pause.
 *
 * The function is always called asynchronously, even if the delay is 0. This
 * is a common trick to schedule a function to run after a batch of browser
 * event processing.
 *
 * @param {Function} listener Function or object that has a handleEvent method.
 * @param {number=} opt_delay Milliseconds to wait; default is 0.
 * @param {Object=} opt_handler Object in whose scope to call the listener.
 * @return {number} A handle to the timer ID.
 */
goog.Timer.callOnce = function(listener, opt_delay, opt_handler) {
  if (goog.isFunction(listener)) {
    if (opt_handler) {
      listener = goog.bind(listener, opt_handler);
    }
  } else if (listener && typeof listener.handleEvent == 'function') {
    // using typeof to prevent strict js warning
    listener = goog.bind(listener.handleEvent, listener);
  } else {
   throw Error('Invalid listener argument');
  }

  if (opt_delay > goog.Timer.MAX_TIMEOUT_) {
    // Timeouts greater than MAX_INT return immediately due to integer
    // overflow in many browsers.  Since MAX_INT is 24.8 days, just don't
    // schedule anything at all.
    return -1;
  } else {
    return goog.Timer.defaultTimerObject.setTimeout(
        listener, opt_delay || 0);
  }
};


/**
 * Clears a timeout initiated by callOnce
 * @param {?number} timerId a timer ID.
 */
goog.Timer.clear = function(timerId) {
  goog.Timer.defaultTimerObject.clearTimeout(timerId);
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Generics method for collection-like classes and objects.
 *
 * @author arv@google.com (Erik Arvidsson)
 *
 * This file contains functions to work with collections. It supports using
 * Map, Set, Array and Object and other classes that implement collection-like
 * methods.
 */


goog.provide('goog.structs');

goog.require('goog.array');
goog.require('goog.object');


// We treat an object as a dictionary if it has getKeys or it is an object that
// isn't arrayLike.


/**
 * Returns the number of values in the collection-like object.
 * @param {Object} col The collection-like object.
 * @return {number} The number of values in the collection-like object.
 */
goog.structs.getCount = function(col) {
  if (typeof col.getCount == 'function') {
    return col.getCount();
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return col.length;
  }
  return goog.object.getCount(col);
};


/**
 * Returns the values of the collection-like object.
 * @param {Object} col The collection-like object.
 * @return {!Array} The values in the collection-like object.
 */
goog.structs.getValues = function(col) {
  if (typeof col.getValues == 'function') {
    return col.getValues();
  }
  if (goog.isString(col)) {
    return col.split('');
  }
  if (goog.isArrayLike(col)) {
    var rv = [];
    var l = col.length;
    for (var i = 0; i < l; i++) {
      rv.push(col[i]);
    }
    return rv;
  }
  return goog.object.getValues(col);
};


/**
 * Returns the keys of the collection. Some collections have no notion of
 * keys/indexes and this function will return undefined in those cases.
 * @param {Object} col The collection-like object.
 * @return {!Array|undefined} The keys in the collection.
 */
goog.structs.getKeys = function(col) {
  if (typeof col.getKeys == 'function') {
    return col.getKeys();
  }
  // if we have getValues but no getKeys we know this is a key-less collection
  if (typeof col.getValues == 'function') {
    return undefined;
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    var rv = [];
    var l = col.length;
    for (var i = 0; i < l; i++) {
      rv.push(i);
    }
    return rv;
  }

  return goog.object.getKeys(col);
};


/**
 * Whether the collection contains the given value. This is O(n) and uses
 * equals (==) to test the existence.
 * @param {Object} col The collection-like object.
 * @param {*} val The value to check for.
 * @return {boolean} True if the map contains the value.
 */
goog.structs.contains = function(col, val) {
  if (typeof col.contains == 'function') {
    return col.contains(val);
  }
  if (typeof col.containsValue == 'function') {
    return col.containsValue(val);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.contains(/** @type {Array} */ (col), val);
  }
  return goog.object.containsValue(col, val);
};


/**
 * Whether the collection is empty.
 * @param {Object} col The collection-like object.
 * @return {boolean} True if empty.
 */
goog.structs.isEmpty = function(col) {
  if (typeof col.isEmpty == 'function') {
    return col.isEmpty();
  }

  // We do not use goog.string.isEmpty because here we treat the string as
  // collection and as such even whitespace matters

  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.isEmpty(/** @type {Array} */ (col));
  }
  return goog.object.isEmpty(col);
};


/**
 * Removes all the elements from the collection.
 * @param {Object} col The collection-like object.
 */
goog.structs.clear = function(col) {
  // NOTE(arv): This should not contain strings because strings are immutable
  if (typeof col.clear == 'function') {
    col.clear();
  } else if (goog.isArrayLike(col)) {
    goog.array.clear((/** @type {goog.array.ArrayLike} */ col));
  } else {
    goog.object.clear(col);
  }
};


/**
 * Calls a function for each value in a collection. The function takes
 * three arguments; the value, the key and the collection.
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and the return value is irrelevant.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within {@code f}.
 */
goog.structs.forEach = function(col, f, opt_obj) {
  if (typeof col.forEach == 'function') {
    col.forEach(f, opt_obj);
  } else if (goog.isArrayLike(col) || goog.isString(col)) {
    goog.array.forEach(/** @type {Array} */ (col), f, opt_obj);
  } else {
    var keys = goog.structs.getKeys(col);
    var values = goog.structs.getValues(col);
    var l = values.length;
    for (var i = 0; i < l; i++) {
      f.call(opt_obj, values[i], keys && keys[i], col);
    }
  }
};


/**
 * Calls a function for every value in the collection. When a call returns true,
 * adds the value to a new collection (Array is returned by default).
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and should return a Boolean. If the
 *     return value is true the value is added to the result collection. If it
 *     is false the value is not included.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {!Object|!Array} A new collection where the passed values are
 *     present. If col is a key-less collection an array is returned.  If col
 *     has keys and values a plain old JS object is returned.
 */
goog.structs.filter = function(col, f, opt_obj) {
  if (typeof col.filter == 'function') {
    return col.filter(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.filter(/** @type {!Array} */ (col), f, opt_obj);
  }

  var rv;
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  if (keys) {
    rv = {};
    for (var i = 0; i < l; i++) {
      if (f.call(opt_obj, values[i], keys[i], col)) {
        rv[keys[i]] = values[i];
      }
    }
  } else {
    // We should not use goog.array.filter here since we want to make sure that
    // the index is undefined as well as make sure that col is passed to the
    // function.
    rv = [];
    for (var i = 0; i < l; i++) {
      if (f.call(opt_obj, values[i], undefined, col)) {
        rv.push(values[i]);
      }
    }
  }
  return rv;
};


/**
 * Calls a function for every value in the collection and adds the result into a
 * new collection (defaults to creating a new Array).
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function
 *     takes 3 arguments (the value, the key or undefined if the collection has
 *     no notion of keys, and the collection) and should return something. The
 *     result will be used as the value in the new collection.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {!Object|!Array} A new collection with the new values.  If col is a
 *     key-less collection an array is returned.  If col has keys and values a
 *     plain old JS object is returned.
 */
goog.structs.map = function(col, f, opt_obj) {
  if (typeof col.map == 'function') {
    return col.map(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.map(/** @type {!Array} */ (col), f, opt_obj);
  }

  var rv;
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  if (keys) {
    rv = {};
    for (var i = 0; i < l; i++) {
      rv[keys[i]] = f.call(opt_obj, values[i], keys[i], col);
    }
  } else {
    // We should not use goog.array.map here since we want to make sure that
    // the index is undefined as well as make sure that col is passed to the
    // function.
    rv = [];
    for (var i = 0; i < l; i++) {
      rv[i] = f.call(opt_obj, values[i], undefined, col);
    }
  }
  return rv;
};


/**
 * Calls f for each value in a collection. If any call returns true this returns
 * true (without checking the rest). If all returns false this returns false.
 *
 * @param {Object|Array|string} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and should return a Boolean.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {boolean} True if any value passes the test.
 */
goog.structs.some = function(col, f, opt_obj) {
  if (typeof col.some == 'function') {
    return col.some(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.some(/** @type {!Array} */ (col), f, opt_obj);
  }
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    if (f.call(opt_obj, values[i], keys && keys[i], col)) {
      return true;
    }
  }
  return false;
};


/**
 * Calls f for each value in a collection. If all calls return true this return
 * true this returns true. If any returns false this returns false at this point
 *  and does not continue to check the remaining values.
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and should return a Boolean.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {boolean} True if all key-value pairs pass the test.
 */
goog.structs.every = function(col, f, opt_obj) {
  if (typeof col.every == 'function') {
    return col.every(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.every(/** @type {!Array} */ (col), f, opt_obj);
  }
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    if (!f.call(opt_obj, values[i], keys && keys[i], col)) {
      return false;
    }
  }
  return true;
};
// Copyright 2011 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines the collection interface.
 *
 * @author nnaze@google.com (Nathan Naze)
 */

goog.provide('goog.structs.Collection');



/**
 * An interface for a collection of values.
 * @interface
 */
goog.structs.Collection = function() {};


/**
 * @param {*} value Value to add to the collection.
 */
goog.structs.Collection.prototype.add;


/**
 * @param {*} value Value to remove from the collection.
 */
goog.structs.Collection.prototype.remove;


/**
 * @param {*} value Value to find in the tree.
 * @return {boolean} Whether the collection contains the specified value.
 */
goog.structs.Collection.prototype.contains;


/**
 * @return {number} The number of values stored in the collection.
 */
goog.structs.Collection.prototype.getCount;

// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Python style iteration utilities.
 * @author arv@google.com (Erik Arvidsson)
 */


goog.provide('goog.iter');
goog.provide('goog.iter.Iterator');
goog.provide('goog.iter.StopIteration');

goog.require('goog.array');
goog.require('goog.asserts');


// TODO(nnaze): Add more functions from Python's itertools.
// http://docs.python.org/library/itertools.html


/**
 * @typedef {goog.iter.Iterator|{length:number}|{__iterator__}}
 */
goog.iter.Iterable;


// For script engines that already support iterators.
if ('StopIteration' in goog.global) {
  /**
   * Singleton Error object that is used to terminate iterations.
   * @type {Error}
   */
  goog.iter.StopIteration = goog.global['StopIteration'];
} else {
  /**
   * Singleton Error object that is used to terminate iterations.
   * @type {Error}
   * @suppress {duplicate}
   */
  goog.iter.StopIteration = Error('StopIteration');
}



/**
 * Class/interface for iterators.  An iterator needs to implement a {@code next}
 * method and it needs to throw a {@code goog.iter.StopIteration} when the
 * iteration passes beyond the end.  Iterators have no {@code hasNext} method.
 * It is recommended to always use the helper functions to iterate over the
 * iterator or in case you are only targeting JavaScript 1.7 for in loops.
 * @constructor
 */
goog.iter.Iterator = function() {};


/**
 * Returns the next value of the iteration.  This will throw the object
 * {@see goog.iter#StopIteration} when the iteration passes the end.
 * @return {*} Any object or value.
 */
goog.iter.Iterator.prototype.next = function() {
  throw goog.iter.StopIteration;
};


/**
 * Returns the {@code Iterator} object itself.  This is used to implement
 * the iterator protocol in JavaScript 1.7
 * @param {boolean=} opt_keys  Whether to return the keys or values. Default is
 *     to only return the values.  This is being used by the for-in loop (true)
 *     and the for-each-in loop (false).  Even though the param gives a hint
 *     about what the iterator will return there is no guarantee that it will
 *     return the keys when true is passed.
 * @return {!goog.iter.Iterator} The object itself.
 */
goog.iter.Iterator.prototype.__iterator__ = function(opt_keys) {
  return this;
};


/**
 * Returns an iterator that knows how to iterate over the values in the object.
 * @param {goog.iter.Iterable} iterable  If the object is an iterator it
 *     will be returned as is.  If the object has a {@code __iterator__} method
 *     that will be called to get the value iterator.  If the object is an
 *     array-like object we create an iterator for that.
 * @return {!goog.iter.Iterator} An iterator that knows how to iterate over the
 *     values in {@code iterable}.
 */
goog.iter.toIterator = function(iterable) {
  if (iterable instanceof goog.iter.Iterator) {
    return iterable;
  }
  if (typeof iterable.__iterator__ == 'function') {
    return iterable.__iterator__(false);
  }
  if (goog.isArrayLike(iterable)) {
    var i = 0;
    var newIter = new goog.iter.Iterator;
    newIter.next = function() {
      while (true) {
        if (i >= iterable.length) {
          throw goog.iter.StopIteration;
        }
        // Don't include deleted elements.
        if (!(i in iterable)) {
          i++;
          continue;
        }
        return iterable[i++];
      }
    };
    return newIter;
  }


  // TODO(arv): Should we fall back on goog.structs.getValues()?
  throw Error('Not implemented');
};


/**
 * Calls a function for each element in the iterator with the element of the
 * iterator passed as argument.
 *
 * @param {goog.iter.Iterable} iterable  The iterator to iterate
 *     over.  If the iterable is an object {@code toIterator} will be called on
 *     it.
 * @param {Function} f  The function to call for every element.  This function
 *     takes 3 arguments (the element, undefined, and the iterator) and the
 *     return value is irrelevant.  The reason for passing undefined as the
 *     second argument is so that the same function can be used in
 *     {@see goog.array#forEach} as well as others.
 * @param {Object=} opt_obj  The object to be used as the value of 'this' within
 *     {@code f}.
 */
goog.iter.forEach = function(iterable, f, opt_obj) {
  if (goog.isArrayLike(iterable)) {
    /** @preserveTry */
    try {
      goog.array.forEach((/** @type {goog.array.ArrayLike} */ iterable), f,
                         opt_obj);
    } catch (ex) {
      if (ex !== goog.iter.StopIteration) {
        throw ex;
      }
    }
  } else {
    iterable = goog.iter.toIterator(iterable);
    /** @preserveTry */
    try {
      while (true) {
        f.call(opt_obj, iterable.next(), undefined, iterable);
      }
    } catch (ex) {
      if (ex !== goog.iter.StopIteration) {
        throw ex;
      }
    }
  }
};


/**
 * Calls a function for every element in the iterator, and if the function
 * returns true adds the element to a new iterator.
 *
 * @param {goog.iter.Iterable} iterable The iterator to iterate over.
 * @param {Function} f The function to call for every element.  This function
 *     takes 3 arguments (the element, undefined, and the iterator) and should
 *     return a boolean.  If the return value is true the element will be
 *     included  in the returned iteror.  If it is false the element is not
 *     included.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {!goog.iter.Iterator} A new iterator in which only elements that
 *     passed the test are present.
 */
goog.iter.filter = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    while (true) {
      var val = iterable.next();
      if (f.call(opt_obj, val, undefined, iterable)) {
        return val;
      }
    }
  };
  return newIter;
};


/**
 * Creates a new iterator that returns the values in a range.  This function
 * can take 1, 2 or 3 arguments:
 * <pre>
 * range(5) same as range(0, 5, 1)
 * range(2, 5) same as range(2, 5, 1)
 * </pre>
 *
 * @param {number} startOrStop  The stop value if only one argument is provided.
 *     The start value if 2 or more arguments are provided.  If only one
 *     argument is used the start value is 0.
 * @param {number=} opt_stop  The stop value.  If left out then the first
 *     argument is used as the stop value.
 * @param {number=} opt_step  The number to increment with between each call to
 *     next.  This can be negative.
 * @return {!goog.iter.Iterator} A new iterator that returns the values in the
 *     range.
 */
goog.iter.range = function(startOrStop, opt_stop, opt_step) {
  var start = 0;
  var stop = startOrStop;
  var step = opt_step || 1;
  if (arguments.length > 1) {
    start = startOrStop;
    stop = opt_stop;
  }
  if (step == 0) {
    throw Error('Range step argument must not be zero');
  }

  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    if (step > 0 && start >= stop || step < 0 && start <= stop) {
      throw goog.iter.StopIteration;
    }
    var rv = start;
    start += step;
    return rv;
  };
  return newIter;
};


/**
 * Joins the values in a iterator with a delimiter.
 * @param {goog.iter.Iterable} iterable  The iterator to get the values from.
 * @param {string} deliminator  The text to put between the values.
 * @return {string} The joined value string.
 */
goog.iter.join = function(iterable, deliminator) {
  return goog.iter.toArray(iterable).join(deliminator);
};


/**
 * For every element in the iterator call a function and return a new iterator
 * with that value.
 *
 * @param {goog.iter.Iterable} iterable The iterator to iterate over.
 * @param {Function} f The function to call for every element.  This function
 *     takes 3 arguments (the element, undefined, and the iterator) and should
 *     return a new value.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {!goog.iter.Iterator} A new iterator that returns the results of
 *     applying the function to each element in the original iterator.
 */
goog.iter.map = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    while (true) {
      var val = iterable.next();
      return f.call(opt_obj, val, undefined, iterable);
    }
  };
  return newIter;
};


/**
 * Passes every element of an iterator into a function and accumulates the
 * result.
 *
 * @param {goog.iter.Iterable} iterable The iterator to iterate over.
 * @param {Function} f The function to call for every element. This function
 *     takes 2 arguments (the function's previous result or the initial value,
 *     and the value of the current element).
 *     function(previousValue, currentElement) : newValue.
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {*} Result of evaluating f repeatedly across the values of
 *     the iterator.
 */
goog.iter.reduce = function(iterable, f, val, opt_obj) {
  var rval = val;
  goog.iter.forEach(iterable, function(val) {
    rval = f.call(opt_obj, rval, val);
  });
  return rval;
};


/**
 * Goes through the values in the iterator. Calls f for each these and if any of
 * them returns true, this returns true (without checking the rest). If all
 * return false this will return false.
 *
 * @param {goog.iter.Iterable} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {boolean} true if any value passes the test.
 */
goog.iter.some = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  /** @preserveTry */
  try {
    while (true) {
      if (f.call(opt_obj, iterable.next(), undefined, iterable)) {
        return true;
      }
    }
  } catch (ex) {
    if (ex !== goog.iter.StopIteration) {
      throw ex;
    }
  }
  return false;
};


/**
 * Goes through the values in the iterator. Calls f for each these and if any of
 * them returns false this returns false (without checking the rest). If all
 * return true this will return true.
 *
 * @param {goog.iter.Iterable} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {boolean} true if every value passes the test.
 */
goog.iter.every = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  /** @preserveTry */
  try {
    while (true) {
      if (!f.call(opt_obj, iterable.next(), undefined, iterable)) {
        return false;
      }
    }
  } catch (ex) {
    if (ex !== goog.iter.StopIteration) {
      throw ex;
    }
  }
  return true;
};


/**
 * Takes zero or more iterators and returns one iterator that will iterate over
 * them in the order chained.
 * @param {...goog.iter.Iterator} var_args  Any number of iterator objects.
 * @return {!goog.iter.Iterator} Returns a new iterator that will iterate over
 *     all the given iterators' contents.
 */
goog.iter.chain = function(var_args) {
  var args = arguments;
  var length = args.length;
  var i = 0;
  var newIter = new goog.iter.Iterator;

  /**
   * @return {*} The next item in the iteration.
   * @this {goog.iter.Iterator}
   */
  newIter.next = function() {
    /** @preserveTry */
    try {
      if (i >= length) {
        throw goog.iter.StopIteration;
      }
      var current = goog.iter.toIterator(args[i]);
      return current.next();
    } catch (ex) {
      if (ex !== goog.iter.StopIteration || i >= length) {
        throw ex;
      } else {
        // In case we got a StopIteration increment counter and try again.
        i++;
        return this.next();
      }
    }
  };

  return newIter;
};


/**
 * Builds a new iterator that iterates over the original, but skips elements as
 * long as a supplied function returns true.
 * @param {goog.iter.Iterable} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object=} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {!goog.iter.Iterator} A new iterator that drops elements from the
 *     original iterator as long as {@code f} is true.
 */
goog.iter.dropWhile = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  var dropping = true;
  newIter.next = function() {
    while (true) {
      var val = iterable.next();
      if (dropping && f.call(opt_obj, val, undefined, iterable)) {
        continue;
      } else {
        dropping = false;
      }
      return val;
    }
  };
  return newIter;
};


/**
 * Builds a new iterator that iterates over the original, but only as long as a
 * supplied function returns true.
 * @param {goog.iter.Iterable} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object=} opt_obj This is used as the 'this' object in f when called.
 * @return {!goog.iter.Iterator} A new iterator that keeps elements in the
 *     original iterator as long as the function is true.
 */
goog.iter.takeWhile = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  var taking = true;
  newIter.next = function() {
    while (true) {
      if (taking) {
        var val = iterable.next();
        if (f.call(opt_obj, val, undefined, iterable)) {
          return val;
        } else {
          taking = false;
        }
      } else {
        throw goog.iter.StopIteration;
      }
    }
  };
  return newIter;
};


/**
 * Converts the iterator to an array
 * @param {goog.iter.Iterable} iterable  The iterator to convert to an array.
 * @return {!Array} An array of the elements the iterator iterates over.
 */
goog.iter.toArray = function(iterable) {
  // Fast path for array-like.
  if (goog.isArrayLike(iterable)) {
    return goog.array.toArray((/** @type {!goog.array.ArrayLike} */ iterable));
  }
  iterable = goog.iter.toIterator(iterable);
  var array = [];
  goog.iter.forEach(iterable, function(val) {
    array.push(val);
  });
  return array;
};


/**
 * Iterates over 2 iterators and returns true if they contain the same sequence
 * of elements and have the same length.
 * @param {goog.iter.Iterable} iterable1  The first iterable object.
 * @param {goog.iter.Iterable} iterable2  The second iterable object.
 * @return {boolean} true if the iterators contain the same sequence of
 *     elements and have the same length.
 */
goog.iter.equals = function(iterable1, iterable2) {
  iterable1 = goog.iter.toIterator(iterable1);
  iterable2 = goog.iter.toIterator(iterable2);
  var b1, b2;
  /** @preserveTry */
  try {
    while (true) {
      b1 = b2 = false;
      var val1 = iterable1.next();
      b1 = true;
      var val2 = iterable2.next();
      b2 = true;
      if (val1 != val2) {
        return false;
      }
    }
  } catch (ex) {
    if (ex !== goog.iter.StopIteration) {
      throw ex;
    } else {
      if (b1 && !b2) {
        // iterable1 done but iterable2 is not done.
        return false;
      }
      if (!b2) {
        /** @preserveTry */
        try {
          // iterable2 not done?
          val2 = iterable2.next();
          // iterable2 not done but iterable1 is done
          return false;
        } catch (ex1) {
          if (ex1 !== goog.iter.StopIteration) {
            throw ex1;
          }
          // iterable2 done as well... They are equal
          return true;
        }
      }
    }
  }
  return false;
};


/**
 * Advances the iterator to the next position, returning the given default value
 * instead of throwing an exception if the iterator has no more entries.
 * @param {goog.iter.Iterable} iterable The iterable object.
 * @param {*} defaultValue The value to return if the iterator is empty.
 * @return {*} The next item in the iteration, or defaultValue if the iterator
 *     was empty.
 */
goog.iter.nextOrValue = function(iterable, defaultValue) {
  try {
    return goog.iter.toIterator(iterable).next();
  } catch (e) {
    if (e != goog.iter.StopIteration) {
      throw e;
    }
    return defaultValue;
  }
};


/**
 * Cartesian product of zero or more sets.  Gives an iterator that gives every
 * combination of one element chosen from each set.  For example,
 * ([1, 2], [3, 4]) gives ([1, 3], [1, 4], [2, 3], [2, 4]).
 * @see http://docs.python.org/library/itertools.html#itertools.product
 * @param {...!goog.array.ArrayLike.<*>} var_args Zero or more sets, as arrays.
 * @return {!goog.iter.Iterator} An iterator that gives each n-tuple (as an
 *     array).
 */
goog.iter.product = function(var_args) {
  var someArrayEmpty = goog.array.some(arguments, function(arr) {
    return !arr.length;
  });

  // An empty set in a cartesian product gives an empty set.
  if (someArrayEmpty || !arguments.length) {
    return new goog.iter.Iterator();
  }

  var iter = new goog.iter.Iterator();
  var arrays = arguments;

  // The first indicies are [0, 0, ...]
  var indicies = goog.array.repeat(0, arrays.length);

  iter.next = function() {

    if (indicies) {
      var retVal = goog.array.map(indicies, function(valueIndex, arrayIndex) {
        return arrays[arrayIndex][valueIndex];
      });

      // Generate the next-largest indicies for the next call.
      // Increase the rightmost index. If it goes over, increase the next
      // rightmost (like carry-over addition).
      for (var i = indicies.length - 1; i >= 0; i--) {
        // Assertion prevents compiler warning below.
        goog.asserts.assert(indicies);
        if (indicies[i] < arrays[i].length - 1) {
          indicies[i]++;
          break;
        }

        // We're at the last indicies (the last element of every array), so
        // the iteration is over on the next call.
        if (i == 0) {
          indicies = null;
          break;
        }
        // Reset the index in this column and loop back to increment the
        // next one.
        indicies[i] = 0;
      }
      return retVal;
    }

    throw goog.iter.StopIteration;
  };

  return iter;
};


/**
 * Create an iterator to cycle over the iterable's elements indefinitely.
 * For example, ([1, 2, 3]) would return : 1, 2, 3, 1, 2, 3, ...
 * @see: http://docs.python.org/library/itertools.html#itertools.cycle.
 * @param {!goog.iter.Iterable} iterable The iterable object.
 * @return {!goog.iter.Iterator} An iterator that iterates indefinitely over
 * the values in {@code iterable}.
 */
goog.iter.cycle = function(iterable) {

  var baseIterator = goog.iter.toIterator(iterable);

  // We maintain a cache to store the iterable elements as we iterate
  // over them. The cache is used to return elements once we have
  // iterated over the iterable once.
  var cache = [];
  var cacheIndex = 0;

  var iter = new goog.iter.Iterator();

  // This flag is set after the iterable is iterated over once
  var useCache = false;

  iter.next = function() {
    var returnElement = null;

    // Pull elements off the original iterator if not using cache
    if (!useCache) {

      try {
        // Return the element from the iterable
        returnElement = baseIterator.next();
        cache.push(returnElement);
        return returnElement;
      } catch (e) {
        // If an exception other than StopIteration is thrown
        // or if there are no elements to iterate over (the iterable was empty)
        // throw an exception
        if (e != goog.iter.StopIteration || goog.array.isEmpty(cache)) {
          throw e;
        }
        // set useCache to true after we know that a 'StopIteration' exception
        // was thrown and the cache is not empty (to handle the 'empty iterable'
        // use case)
        useCache = true;
      }
    }

    returnElement = cache[cacheIndex];
    cacheIndex = (cacheIndex + 1) % cache.length;

    return returnElement;
  };

  return iter;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Datastructure: Hash Map.
 *
 * @author arv@google.com (Erik Arvidsson)
 * @author jonp@google.com (Jon Perlow) Optimized for IE6
 *
 * This file contains an implementation of a Map structure. It implements a lot
 * of the methods used in goog.structs so those functions work on hashes.  For
 * convenience with common usage the methods accept any type for the key, though
 * internally they will be cast to strings.
 */


goog.provide('goog.structs.Map');

goog.require('goog.iter.Iterator');
goog.require('goog.iter.StopIteration');
goog.require('goog.object');
goog.require('goog.structs');



/**
 * Class for Hash Map datastructure.
 * @param {*=} opt_map Map or Object to initialize the map with.
 * @param {...*} var_args If 2 or more arguments are present then they
 *     will be used as key-value pairs.
 * @constructor
 */
goog.structs.Map = function(opt_map, var_args) {

  /**
   * Underlying JS object used to implement the map.
   * @type {!Object}
   * @private
   */
  this.map_ = {};

  /**
   * An array of keys. This is necessary for two reasons:
   *   1. Iterating the keys using for (var key in this.map_) allocates an
   *      object for every key in IE which is really bad for IE6 GC perf.
   *   2. Without a side data structure, we would need to escape all the keys
   *      as that would be the only way we could tell during iteration if the
   *      key was an internal key or a property of the object.
   *
   * This array can contain deleted keys so it's necessary to check the map
   * as well to see if the key is still in the map (this doesn't require a
   * memory allocation in IE).
   * @type {!Array.<string>}
   * @private
   */
  this.keys_ = [];

  var argLength = arguments.length;

  if (argLength > 1) {
    if (argLength % 2) {
      throw Error('Uneven number of arguments');
    }
    for (var i = 0; i < argLength; i += 2) {
      this.set(arguments[i], arguments[i + 1]);
    }
  } else if (opt_map) {
    this.addAll(/** @type {Object} */ (opt_map));
  }
};


/**
 * The number of key value pairs in the map.
 * @private
 * @type {number}
 */
goog.structs.Map.prototype.count_ = 0;


/**
 * Version used to detect changes while iterating.
 * @private
 * @type {number}
 */
goog.structs.Map.prototype.version_ = 0;


/**
 * @return {number} The number of key-value pairs in the map.
 */
goog.structs.Map.prototype.getCount = function() {
  return this.count_;
};


/**
 * Returns the values of the map.
 * @return {!Array} The values in the map.
 */
goog.structs.Map.prototype.getValues = function() {
  this.cleanupKeysArray_();

  var rv = [];
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    rv.push(this.map_[key]);
  }
  return rv;
};


/**
 * Returns the keys of the map.
 * @return {!Array.<string>} Array of string values.
 */
goog.structs.Map.prototype.getKeys = function() {
  this.cleanupKeysArray_();
  return /** @type {!Array.<string>} */ (this.keys_.concat());
};


/**
 * Whether the map contains the given key.
 * @param {*} key The key to check for.
 * @return {boolean} Whether the map contains the key.
 */
goog.structs.Map.prototype.containsKey = function(key) {
  return goog.structs.Map.hasKey_(this.map_, key);
};


/**
 * Whether the map contains the given value. This is O(n).
 * @param {*} val The value to check for.
 * @return {boolean} Whether the map contains the value.
 */
goog.structs.Map.prototype.containsValue = function(val) {
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    if (goog.structs.Map.hasKey_(this.map_, key) && this.map_[key] == val) {
      return true;
    }
  }
  return false;
};


/**
 * Whether this map is equal to the argument map.
 * @param {goog.structs.Map} otherMap The map against which to test equality.
 * @param {function(*, *) : boolean=} opt_equalityFn Optional equality function
 *     to test equality of values. If not specified, this will test whether
 *     the values contained in each map are identical objects.
 * @return {boolean} Whether the maps are equal.
 */
goog.structs.Map.prototype.equals = function(otherMap, opt_equalityFn) {
  if (this === otherMap) {
    return true;
  }

  if (this.count_ != otherMap.getCount()) {
    return false;
  }

  var equalityFn = opt_equalityFn || goog.structs.Map.defaultEquals;

  this.cleanupKeysArray_();
  for (var key, i = 0; key = this.keys_[i]; i++) {
    if (!equalityFn(this.get(key), otherMap.get(key))) {
      return false;
    }
  }

  return true;
};


/**
 * Default equality test for values.
 * @param {*} a The first value.
 * @param {*} b The second value.
 * @return {boolean} Whether a and b reference the same object.
 */
goog.structs.Map.defaultEquals = function(a, b) {
  return a === b;
};


/**
 * @return {boolean} Whether the map is empty.
 */
goog.structs.Map.prototype.isEmpty = function() {
  return this.count_ == 0;
};


/**
 * Removes all key-value pairs from the map.
 */
goog.structs.Map.prototype.clear = function() {
  this.map_ = {};
  this.keys_.length = 0;
  this.count_ = 0;
  this.version_ = 0;
};


/**
 * Removes a key-value pair based on the key. This is O(logN) amortized due to
 * updating the keys array whenever the count becomes half the size of the keys
 * in the keys array.
 * @param {*} key  The key to remove.
 * @return {boolean} Whether object was removed.
 */
goog.structs.Map.prototype.remove = function(key) {
  if (goog.structs.Map.hasKey_(this.map_, key)) {
    delete this.map_[key];
    this.count_--;
    this.version_++;

    // clean up the keys array if the threshhold is hit
    if (this.keys_.length > 2 * this.count_) {
      this.cleanupKeysArray_();
    }

    return true;
  }
  return false;
};


/**
 * Cleans up the temp keys array by removing entries that are no longer in the
 * map.
 * @private
 */
goog.structs.Map.prototype.cleanupKeysArray_ = function() {
  if (this.count_ != this.keys_.length) {
    // First remove keys that are no longer in the map.
    var srcIndex = 0;
    var destIndex = 0;
    while (srcIndex < this.keys_.length) {
      var key = this.keys_[srcIndex];
      if (goog.structs.Map.hasKey_(this.map_, key)) {
        this.keys_[destIndex++] = key;
      }
      srcIndex++;
    }
    this.keys_.length = destIndex;
  }

  if (this.count_ != this.keys_.length) {
    // If the count still isn't correct, that means we have duplicates. This can
    // happen when the same key is added and removed multiple times. Now we have
    // to allocate one extra Object to remove the duplicates. This could have
    // been done in the first pass, but in the common case, we can avoid
    // allocating an extra object by only doing this when necessary.
    var seen = {};
    var srcIndex = 0;
    var destIndex = 0;
    while (srcIndex < this.keys_.length) {
      var key = this.keys_[srcIndex];
      if (!(goog.structs.Map.hasKey_(seen, key))) {
        this.keys_[destIndex++] = key;
        seen[key] = 1;
      }
      srcIndex++;
    }
    this.keys_.length = destIndex;
  }
};


/**
 * Returns the value for the given key.  If the key is not found and the default
 * value is not given this will return {@code undefined}.
 * @param {*} key The key to get the value for.
 * @param {*=} opt_val The value to return if no item is found for the given
 *     key, defaults to undefined.
 * @return {*} The value for the given key.
 */
goog.structs.Map.prototype.get = function(key, opt_val) {
  if (goog.structs.Map.hasKey_(this.map_, key)) {
    return this.map_[key];
  }
  return opt_val;
};


/**
 * Adds a key-value pair to the map.
 * @param {*} key The key.
 * @param {*} value The value to add.
 */
goog.structs.Map.prototype.set = function(key, value) {
  if (!(goog.structs.Map.hasKey_(this.map_, key))) {
    this.count_++;
    this.keys_.push(key);
    // Only change the version if we add a new key.
    this.version_++;
  }
  this.map_[key] = value;
};


/**
 * Adds multiple key-value pairs from another goog.structs.Map or Object.
 * @param {Object} map  Object containing the data to add.
 */
goog.structs.Map.prototype.addAll = function(map) {
  var keys, values;
  if (map instanceof goog.structs.Map) {
    keys = map.getKeys();
    values = map.getValues();
  } else {
    keys = goog.object.getKeys(map);
    values = goog.object.getValues(map);
  }
  // we could use goog.array.forEach here but I don't want to introduce that
  // dependency just for this.
  for (var i = 0; i < keys.length; i++) {
    this.set(keys[i], values[i]);
  }
};


/**
 * Clones a map and returns a new map.
 * @return {!goog.structs.Map} A new map with the same key-value pairs.
 */
goog.structs.Map.prototype.clone = function() {
  return new goog.structs.Map(this);
};


/**
 * Returns a new map in which all the keys and values are interchanged
 * (keys become values and values become keys). If multiple keys map to the
 * same value, the chosen transposed value is implementation-dependent.
 *
 * It acts very similarly to {goog.object.transpose(Object)}.
 *
 * @return {!goog.structs.Map} The transposed map.
 */
goog.structs.Map.prototype.transpose = function() {
  var transposed = new goog.structs.Map();
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    var value = this.map_[key];
    transposed.set(value, key);
  }

  return transposed;
};


/**
 * @return {!Object} Object representation of the map.
 */
goog.structs.Map.prototype.toObject = function() {
  this.cleanupKeysArray_();
  var obj = {};
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    obj[key] = this.map_[key];
  }
  return obj;
};


/**
 * Returns an iterator that iterates over the keys in the map.  Removal of keys
 * while iterating might have undesired side effects.
 * @return {!goog.iter.Iterator} An iterator over the keys in the map.
 */
goog.structs.Map.prototype.getKeyIterator = function() {
  return this.__iterator__(true);
};


/**
 * Returns an iterator that iterates over the values in the map.  Removal of
 * keys while iterating might have undesired side effects.
 * @return {!goog.iter.Iterator} An iterator over the values in the map.
 */
goog.structs.Map.prototype.getValueIterator = function() {
  return this.__iterator__(false);
};


/**
 * Returns an iterator that iterates over the values or the keys in the map.
 * This throws an exception if the map was mutated since the iterator was
 * created.
 * @param {boolean=} opt_keys True to iterate over the keys. False to iterate
 *     over the values.  The default value is false.
 * @return {!goog.iter.Iterator} An iterator over the values or keys in the map.
 */
goog.structs.Map.prototype.__iterator__ = function(opt_keys) {
  // Clean up keys to minimize the risk of iterating over dead keys.
  this.cleanupKeysArray_();

  var i = 0;
  var keys = this.keys_;
  var map = this.map_;
  var version = this.version_;
  var selfObj = this;

  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    while (true) {
      if (version != selfObj.version_) {
        throw Error('The map has changed since the iterator was created');
      }
      if (i >= keys.length) {
        throw goog.iter.StopIteration;
      }
      var key = keys[i++];
      return opt_keys ? key : map[key];
    }
  };
  return newIter;
};


/**
 * Safe way to test for hasOwnProperty.  It even allows testing for
 * 'hasOwnProperty'.
 * @param {Object} obj The object to test for presence of the given key.
 * @param {*} key The key to check for.
 * @return {boolean} Whether the object has the key.
 * @private
 */
goog.structs.Map.hasKey_ = function(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Datastructure: Set.
 *
 * @author arv@google.com (Erik Arvidsson)
 * @author pallosp@google.com (Peter Pallos)
 *
 * This class implements a set data structure. Adding and removing is O(1). It
 * supports both object and primitive values. Be careful because you can add
 * both 1 and new Number(1), because these are not the same. You can even add
 * multiple new Number(1) because these are not equal.
 */


goog.provide('goog.structs.Set');

goog.require('goog.structs');
goog.require('goog.structs.Collection');
goog.require('goog.structs.Map');



/**
 * A set that can contain both primitives and objects.  Adding and removing
 * elements is O(1).  Primitives are treated as identical if they have the same
 * type and convert to the same string.  Objects are treated as identical only
 * if they are references to the same object.  WARNING: A goog.structs.Set can
 * contain both 1 and (new Number(1)), because they are not the same.  WARNING:
 * Adding (new Number(1)) twice will yield two distinct elements, because they
 * are two different objects.  WARNING: Any object that is added to a
 * goog.structs.Set will be modified!  Because goog.getUid() is used to
 * identify objects, every object in the set will be mutated.
 * @param {Array|Object=} opt_values Initial values to start with.
 * @constructor
 * @implements {goog.structs.Collection}
 */
goog.structs.Set = function(opt_values) {
  this.map_ = new goog.structs.Map;
  if (opt_values) {
    this.addAll(opt_values);
  }
};


/**
 * Obtains a unique key for an element of the set.  Primitives will yield the
 * same key if they have the same type and convert to the same string.  Object
 * references will yield the same key only if they refer to the same object.
 * @param {*} val Object or primitive value to get a key for.
 * @return {string} A unique key for this value/object.
 * @private
 */
goog.structs.Set.getKey_ = function(val) {
  var type = typeof val;
  if (type == 'object' && val || type == 'function') {
    return 'o' + goog.getUid(/** @type {Object} */ (val));
  } else {
    return type.substr(0, 1) + val;
  }
};


/**
 * @return {number} The number of elements in the set.
 */
goog.structs.Set.prototype.getCount = function() {
  return this.map_.getCount();
};


/**
 * Add a primitive or an object to the set.
 * @param {*} element The primitive or object to add.
 */
goog.structs.Set.prototype.add = function(element) {
  this.map_.set(goog.structs.Set.getKey_(element), element);
};


/**
 * Adds all the values in the given collection to this set.
 * @param {Array|Object} col A collection containing the elements to add.
 */
goog.structs.Set.prototype.addAll = function(col) {
  var values = goog.structs.getValues(col);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    this.add(values[i]);
  }
};


/**
 * Removes all values in the given collection from this set.
 * @param {Array|Object} col A collection containing the elements to remove.
 */
goog.structs.Set.prototype.removeAll = function(col) {
  var values = goog.structs.getValues(col);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    this.remove(values[i]);
  }
};


/**
 * Removes the given element from this set.
 * @param {*} element The primitive or object to remove.
 * @return {boolean} Whether the element was found and removed.
 */
goog.structs.Set.prototype.remove = function(element) {
  return this.map_.remove(goog.structs.Set.getKey_(element));
};


/**
 * Removes all elements from this set.
 */
goog.structs.Set.prototype.clear = function() {
  this.map_.clear();
};


/**
 * Tests whether this set is empty.
 * @return {boolean} True if there are no elements in this set.
 */
goog.structs.Set.prototype.isEmpty = function() {
  return this.map_.isEmpty();
};


/**
 * Tests whether this set contains the given element.
 * @param {*} element The primitive or object to test for.
 * @return {boolean} True if this set contains the given element.
 */
goog.structs.Set.prototype.contains = function(element) {
  return this.map_.containsKey(goog.structs.Set.getKey_(element));
};


/**
 * Tests whether this set contains all the values in a given collection.
 * Repeated elements in the collection are ignored, e.g.  (new
 * goog.structs.Set([1, 2])).containsAll([1, 1]) is True.
 * @param {Object} col A collection-like object.
 * @return {boolean} True if the set contains all elements.
 */
goog.structs.Set.prototype.containsAll = function(col) {
  return goog.structs.every(col, this.contains, this);
};


/**
 * Finds all values that are present in both this set and the given collection.
 * @param {Array|Object} col A collection.
 * @return {!goog.structs.Set} A new set containing all the values (primitives
 *     or objects) present in both this set and the given collection.
 */
goog.structs.Set.prototype.intersection = function(col) {
  var result = new goog.structs.Set();

  var values = goog.structs.getValues(col);
  for (var i = 0; i < values.length; i++) {
    var value = values[i];
    if (this.contains(value)) {
      result.add(value);
    }
  }

  return result;
};


/**
 * Finds all values that are present in this set and not in the given
 * collection.
 * @param {Array|Object} col A collection.
 * @return {!goog.structs.Set} A new set containing all the values
 *     (primitives or objects) present in this set but not in the given
 *     collection.
 */
goog.structs.Set.prototype.difference = function(col) {
  var result = this.clone();
  result.removeAll(col);
  return result;
};


/**
 * Returns an array containing all the elements in this set.
 * @return {!Array} An array containing all the elements in this set.
 */
goog.structs.Set.prototype.getValues = function() {
  return this.map_.getValues();
};


/**
 * Creates a shallow clone of this set.
 * @return {!goog.structs.Set} A new set containing all the same elements as
 *     this set.
 */
goog.structs.Set.prototype.clone = function() {
  return new goog.structs.Set(this);
};


/**
 * Tests whether the given collection consists of the same elements as this set,
 * regardless of order, without repetition.  Primitives are treated as equal if
 * they have the same type and convert to the same string; objects are treated
 * as equal if they are references to the same object.  This operation is O(n).
 * @param {Object} col A collection.
 * @return {boolean} True if the given collection consists of the same elements
 *     as this set, regardless of order, without repetition.
 */
goog.structs.Set.prototype.equals = function(col) {
  return this.getCount() == goog.structs.getCount(col) && this.isSubsetOf(col);
};


/**
 * Tests whether the given collection contains all the elements in this set.
 * Primitives are treated as equal if they have the same type and convert to the
 * same string; objects are treated as equal if they are references to the same
 * object.  This operation is O(n).
 * @param {Object} col A collection.
 * @return {boolean} True if this set is a subset of the given collection.
 */
goog.structs.Set.prototype.isSubsetOf = function(col) {
  var colCount = goog.structs.getCount(col);
  if (this.getCount() > colCount) {
    return false;
  }
  // TODO(user) Find the minimal collection size where the conversion makes
  // the contains() method faster.
  if (!(col instanceof goog.structs.Set) && colCount > 5) {
    // Convert to a goog.structs.Set so that goog.structs.contains runs in
    // O(1) time instead of O(n) time.
    col = new goog.structs.Set(col);
  }
  return goog.structs.every(this, function(value) {
    return goog.structs.contains(col, value);
  });
};


/**
 * Returns an iterator that iterates over the elements in this set.
 * @param {boolean=} opt_keys This argument is ignored.
 * @return {!goog.iter.Iterator} An iterator over the elements in this set.
 */
goog.structs.Set.prototype.__iterator__ = function(opt_keys) {
  return this.map_.__iterator__(false);
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Logging and debugging utilities.
 *
 * @see ../demos/debug.html
 */

goog.provide('goog.debug');

goog.require('goog.array');
goog.require('goog.string');
goog.require('goog.structs.Set');
goog.require('goog.userAgent');


/**
 * Catches onerror events fired by windows and similar objects.
 * @param {function(Object)} logFunc The function to call with the error
 *    information.
 * @param {boolean=} opt_cancel Whether to stop the error from reaching the
 *    browser.
 * @param {Object=} opt_target Object that fires onerror events.
 */
goog.debug.catchErrors = function(logFunc, opt_cancel, opt_target) {
  var target = opt_target || goog.global;
  var oldErrorHandler = target.onerror;
  var retVal = !!opt_cancel;

  // Chrome interprets onerror return value backwards (http://crbug.com/92062)
  // until it was fixed in webkit revision r94061 (Webkit 535.3). This
  // workaround still needs to be skipped in Safari after the webkit change
  // gets pushed out in Safari.
  // See https://bugs.webkit.org/show_bug.cgi?id=67119
  if (goog.userAgent.WEBKIT && !goog.userAgent.isVersion('535.3')) {
    retVal = !retVal;
  }
  target.onerror = function(message, url, line) {
    if (oldErrorHandler) {
      oldErrorHandler(message, url, line);
    }
    logFunc({
      message: message,
      fileName: url,
      line: line
    });
    return retVal;
  };
};


/**
 * Creates a string representing an object and all its properties.
 * @param {Object|null|undefined} obj Object to expose.
 * @param {boolean=} opt_showFn Show the functions as well as the properties,
 *     default is false.
 * @return {string} The string representation of {@code obj}.
 */
goog.debug.expose = function(obj, opt_showFn) {
  if (typeof obj == 'undefined') {
    return 'undefined';
  }
  if (obj == null) {
    return 'NULL';
  }
  var str = [];

  for (var x in obj) {
    if (!opt_showFn && goog.isFunction(obj[x])) {
      continue;
    }
    var s = x + ' = ';
    /** @preserveTry */
    try {
      s += obj[x];
    } catch (e) {
      s += '*** ' + e + ' ***';
    }
    str.push(s);
  }
  return str.join('\n');
};


/**
 * Creates a string representing a given primitive or object, and for an
 * object, all its properties and nested objects.  WARNING: If an object is
 * given, it and all its nested objects will be modified.  To detect reference
 * cycles, this method identifies objects using goog.getUid() which mutates the
 * object.
 * @param {*} obj Object to expose.
 * @param {boolean=} opt_showFn Also show properties that are functions (by
 *     default, functions are omitted).
 * @return {string} A string representation of {@code obj}.
 */
goog.debug.deepExpose = function(obj, opt_showFn) {
  var previous = new goog.structs.Set();
  var str = [];

  var helper = function(obj, space) {
    var nestspace = space + '  ';

    var indentMultiline = function(str) {
      return str.replace(/\n/g, '\n' + space);
    };

    /** @preserveTry */
    try {
      if (!goog.isDef(obj)) {
        str.push('undefined');
      } else if (goog.isNull(obj)) {
        str.push('NULL');
      } else if (goog.isString(obj)) {
        str.push('"' + indentMultiline(obj) + '"');
      } else if (goog.isFunction(obj)) {
        str.push(indentMultiline(String(obj)));
      } else if (goog.isObject(obj)) {
        if (previous.contains(obj)) {
          // TODO(user): This is a bug; it falsely detects non-loops as loops
          // when the reference tree contains two references to the same object.
          str.push('*** reference loop detected ***');
        } else {
          previous.add(obj);
          str.push('{');
          for (var x in obj) {
            if (!opt_showFn && goog.isFunction(obj[x])) {
              continue;
            }
            str.push('\n');
            str.push(nestspace);
            str.push(x + ' = ');
            helper(obj[x], nestspace);
          }
          str.push('\n' + space + '}');
        }
      } else {
        str.push(obj);
      }
    } catch (e) {
      str.push('*** ' + e + ' ***');
    }
  };

  helper(obj, '');
  return str.join('');
};


/**
 * Recursively outputs a nested array as a string.
 * @param {Array} arr The array.
 * @return {string} String representing nested array.
 */
goog.debug.exposeArray = function(arr) {
  var str = [];
  for (var i = 0; i < arr.length; i++) {
    if (goog.isArray(arr[i])) {
      str.push(goog.debug.exposeArray(arr[i]));
    } else {
      str.push(arr[i]);
    }
  }
  return '[ ' + str.join(', ') + ' ]';
};


/**
 * Exposes an exception that has been caught by a try...catch and outputs the
 * error with a stack trace.
 * @param {Object} err Error object or string.
 * @param {Function=} opt_fn Optional function to start stack trace from.
 * @return {string} Details of exception.
 */
goog.debug.exposeException = function(err, opt_fn) {
  /** @preserveTry */
  try {
    var e = goog.debug.normalizeErrorObject(err);

    // Create the error message
    var error = 'Message: ' + goog.string.htmlEscape(e.message) +
        '\nUrl: <a href="view-source:' + e.fileName + '" target="_new">' +
        e.fileName + '</a>\nLine: ' + e.lineNumber + '\n\nBrowser stack:\n' +
        goog.string.htmlEscape(e.stack + '-> ') +
        '[end]\n\nJS stack traversal:\n' + goog.string.htmlEscape(
            goog.debug.getStacktrace(opt_fn) + '-> ');
    return error;
  } catch (e2) {
    return 'Exception trying to expose exception! You win, we lose. ' + e2;
  }
};


/**
 * Normalizes the error/exception object between browsers.
 * @param {Object} err Raw error object.
 * @return {Object} Normalized error object.
 */
goog.debug.normalizeErrorObject = function(err) {
  var href = goog.getObjectByName('window.location.href');
  if (goog.isString(err)) {
    return {
      'message': err,
      'name': 'Unknown error',
      'lineNumber': 'Not available',
      'fileName': href,
      'stack': 'Not available'
    };
  }

  var lineNumber, fileName;
  var threwError = false;

  try {
    lineNumber = err.lineNumber || err.line || 'Not available';
  } catch (e) {
    // Firefox 2 sometimes throws an error when accessing 'lineNumber':
    // Message: Permission denied to get property UnnamedClass.lineNumber
    lineNumber = 'Not available';
    threwError = true;
  }

  try {
    fileName = err.fileName || err.filename || err.sourceURL || href;
  } catch (e) {
    // Firefox 2 may also throw an error when accessing 'filename'.
    fileName = 'Not available';
    threwError = true;
  }

  // The IE Error object contains only the name and the message.
  // The Safari Error object uses the line and sourceURL fields.
  if (threwError || !err.lineNumber || !err.fileName || !err.stack) {
    return {
      'message': err.message,
      'name': err.name,
      'lineNumber': lineNumber,
      'fileName': fileName,
      'stack': err.stack || 'Not available'
    };
  }

  // Standards error object
  return err;
};


/**
 * Converts an object to an Error if it's a String,
 * adds a stacktrace if there isn't one,
 * and optionally adds an extra message.
 * @param {Error|string} err  the original thrown object or string.
 * @param {string=} opt_message  optional additional message to add to the
 *     error.
 * @return {Error} If err is a string, it is used to create a new Error,
 *     which is enhanced and returned.  Otherwise err itself is enhanced
 *     and returned.
 */
goog.debug.enhanceError = function(err, opt_message) {
  var error = typeof err == 'string' ? Error(err) : err;
  if (!error.stack) {
    error.stack = goog.debug.getStacktrace(arguments.callee.caller);
  }
  if (opt_message) {
    // find the first unoccupied 'messageX' property
    var x = 0;
    while (error['message' + x]) {
      ++x;
    }
    error['message' + x] = String(opt_message);
  }
  return error;
};


/**
 * Gets the current stack trace. Simple and iterative - doesn't worry about
 * catching circular references or getting the args.
 * @param {number=} opt_depth Optional maximum depth to trace back to.
 * @return {string} A string with the function names of all functions in the
 *     stack, separated by \n.
 */
goog.debug.getStacktraceSimple = function(opt_depth) {
  var sb = [];
  var fn = arguments.callee.caller;
  var depth = 0;

  while (fn && (!opt_depth || depth < opt_depth)) {
    sb.push(goog.debug.getFunctionName(fn));
    sb.push('()\n');
    /** @preserveTry */
    try {
      fn = fn.caller;
    } catch (e) {
      sb.push('[exception trying to get caller]\n');
      break;
    }
    depth++;
    if (depth >= goog.debug.MAX_STACK_DEPTH) {
      sb.push('[...long stack...]');
      break;
    }
  }
  if (opt_depth && depth >= opt_depth) {
    sb.push('[...reached max depth limit...]');
  } else {
    sb.push('[end]');
  }

  return sb.join('');
};


/**
 * Max length of stack to try and output
 * @type {number}
 */
goog.debug.MAX_STACK_DEPTH = 50;


/**
 * Gets the current stack trace, either starting from the caller or starting
 * from a specified function that's currently on the call stack.
 * @param {Function=} opt_fn Optional function to start getting the trace from.
 *     If not provided, defaults to the function that called this.
 * @return {string} Stack trace.
 */
goog.debug.getStacktrace = function(opt_fn) {
  return goog.debug.getStacktraceHelper_(opt_fn || arguments.callee.caller, []);
};


/**
 * Private helper for getStacktrace().
 * @param {Function} fn Function to start getting the trace from.
 * @param {Array} visited List of functions visited so far.
 * @return {string} Stack trace starting from function fn.
 * @private
 */
goog.debug.getStacktraceHelper_ = function(fn, visited) {
  var sb = [];

  // Circular reference, certain functions like bind seem to cause a recursive
  // loop so we need to catch circular references
  if (goog.array.contains(visited, fn)) {
    sb.push('[...circular reference...]');

  // Traverse the call stack until function not found or max depth is reached
  } else if (fn && visited.length < goog.debug.MAX_STACK_DEPTH) {
    sb.push(goog.debug.getFunctionName(fn) + '(');
    var args = fn.arguments;
    for (var i = 0; i < args.length; i++) {
      if (i > 0) {
        sb.push(', ');
      }
      var argDesc;
      var arg = args[i];
      switch (typeof arg) {
        case 'object':
          argDesc = arg ? 'object' : 'null';
          break;

        case 'string':
          argDesc = arg;
          break;

        case 'number':
          argDesc = String(arg);
          break;

        case 'boolean':
          argDesc = arg ? 'true' : 'false';
          break;

        case 'function':
          argDesc = goog.debug.getFunctionName(arg);
          argDesc = argDesc ? argDesc : '[fn]';
          break;

        case 'undefined':
        default:
          argDesc = typeof arg;
          break;
      }

      if (argDesc.length > 40) {
        argDesc = argDesc.substr(0, 40) + '...';
      }
      sb.push(argDesc);
    }
    visited.push(fn);
    sb.push(')\n');
    /** @preserveTry */
    try {
      sb.push(goog.debug.getStacktraceHelper_(fn.caller, visited));
    } catch (e) {
      sb.push('[exception trying to get caller]\n');
    }

  } else if (fn) {
    sb.push('[...long stack...]');
  } else {
    sb.push('[end]');
  }
  return sb.join('');
};


/**
 * Set a custom function name resolver.
 * @param {function(Function): string} resolver Resolves functions to their
 *     names.
 */
goog.debug.setFunctionResolver = function(resolver) {
  goog.debug.fnNameResolver_ = resolver;
};


/**
 * Gets a function name
 * @param {Function} fn Function to get name of.
 * @return {string} Function's name.
 */
goog.debug.getFunctionName = function(fn) {
  if (goog.debug.fnNameCache_[fn]) {
    return goog.debug.fnNameCache_[fn];
  }
  if (goog.debug.fnNameResolver_) {
    var name = goog.debug.fnNameResolver_(fn);
    if (name) {
      goog.debug.fnNameCache_[fn] = name;
      return name;
    }
  }

  // Heuristically determine function name based on code.
  var functionSource = String(fn);
  if (!goog.debug.fnNameCache_[functionSource]) {
    var matches = /function ([^\(]+)/.exec(functionSource);
    if (matches) {
      var method = matches[1];
      goog.debug.fnNameCache_[functionSource] = method;
    } else {
      goog.debug.fnNameCache_[functionSource] = '[Anonymous]';
    }
  }

  return goog.debug.fnNameCache_[functionSource];
};


/**
 * Makes whitespace visible by replacing it with printable characters.
 * This is useful in finding diffrences between the expected and the actual
 * output strings of a testcase.
 * @param {string} string whose whitespace needs to be made visible.
 * @return {string} string whose whitespace is made visible.
 */
goog.debug.makeWhitespaceVisible = function(string) {
  return string.replace(/ /g, '[_]')
      .replace(/\f/g, '[f]')
      .replace(/\n/g, '[n]\n')
      .replace(/\r/g, '[r]')
      .replace(/\t/g, '[t]');
};


/**
 * Hash map for storing function names that have already been looked up.
 * @type {Object}
 * @private
 */
goog.debug.fnNameCache_ = {};


/**
 * Resolves functions to their names.  Resolved function names will be cached.
 * @type {function(Function):string}
 * @private
 */
goog.debug.fnNameResolver_;
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Definition of the LogRecord class. Please minimize
 * dependencies this file has on other closure classes as any dependency it
 * takes won't be able to use the logging infrastructure.
 *
 */

goog.provide('goog.debug.LogRecord');



/**
 * LogRecord objects are used to pass logging requests between
 * the logging framework and individual log Handlers.
 * @constructor
 * @param {goog.debug.Logger.Level} level One of the level identifiers.
 * @param {string} msg The string message.
 * @param {string} loggerName The name of the source logger.
 * @param {number=} opt_time Time this log record was created if other than now.
 *     If 0, we use #goog.now.
 * @param {number=} opt_sequenceNumber Sequence number of this log record. This
 *     should only be passed in when restoring a log record from persistence.
 */
goog.debug.LogRecord = function(level, msg, loggerName,
    opt_time, opt_sequenceNumber) {
  this.reset(level, msg, loggerName, opt_time, opt_sequenceNumber);
};


/**
 * Time the LogRecord was created.
 * @type {number}
 * @private
 */
goog.debug.LogRecord.prototype.time_;


/**
 * Level of the LogRecord
 * @type {goog.debug.Logger.Level}
 * @private
 */
goog.debug.LogRecord.prototype.level_;


/**
 * Message associated with the record
 * @type {string}
 * @private
 */
goog.debug.LogRecord.prototype.msg_;


/**
 * Name of the logger that created the record.
 * @type {string}
 * @private
 */
goog.debug.LogRecord.prototype.loggerName_;


/**
 * Sequence number for the LogRecord. Each record has a unique sequence number
 * that is greater than all log records created before it.
 * @type {number}
 * @private
 */
goog.debug.LogRecord.prototype.sequenceNumber_ = 0;


/**
 * Exception associated with the record
 * @type {Object}
 * @private
 */
goog.debug.LogRecord.prototype.exception_ = null;


/**
 * Exception text associated with the record
 * @type {?string}
 * @private
 */
goog.debug.LogRecord.prototype.exceptionText_ = null;


/**
 * @define {boolean} Whether to enable log sequence numbers.
 */
goog.debug.LogRecord.ENABLE_SEQUENCE_NUMBERS = true;


/**
 * A sequence counter for assigning increasing sequence numbers to LogRecord
 * objects.
 * @type {number}
 * @private
 */
goog.debug.LogRecord.nextSequenceNumber_ = 0;


/**
 * Sets all fields of the log record.
 * @param {goog.debug.Logger.Level} level One of the level identifiers.
 * @param {string} msg The string message.
 * @param {string} loggerName The name of the source logger.
 * @param {number=} opt_time Time this log record was created if other than now.
 *     If 0, we use #goog.now.
 * @param {number=} opt_sequenceNumber Sequence number of this log record. This
 *     should only be passed in when restoring a log record from persistence.
 */
goog.debug.LogRecord.prototype.reset = function(level, msg, loggerName,
    opt_time, opt_sequenceNumber) {
  if (goog.debug.LogRecord.ENABLE_SEQUENCE_NUMBERS) {
    this.sequenceNumber_ = typeof opt_sequenceNumber == 'number' ?
        opt_sequenceNumber : goog.debug.LogRecord.nextSequenceNumber_++;
  }

  this.time_ = opt_time || goog.now();
  this.level_ = level;
  this.msg_ = msg;
  this.loggerName_ = loggerName;
  delete this.exception_;
  delete this.exceptionText_;
};


/**
 * Get the source Logger's name.
 *
 * @return {string} source logger name (may be null).
 */
goog.debug.LogRecord.prototype.getLoggerName = function() {
  return this.loggerName_;
};


/**
 * Get the exception that is part of the log record.
 *
 * @return {Object} the exception.
 */
goog.debug.LogRecord.prototype.getException = function() {
  return this.exception_;
};


/**
 * Set the exception that is part of the log record.
 *
 * @param {Object} exception the exception.
 */
goog.debug.LogRecord.prototype.setException = function(exception) {
  this.exception_ = exception;
};


/**
 * Get the exception text that is part of the log record.
 *
 * @return {?string} Exception text.
 */
goog.debug.LogRecord.prototype.getExceptionText = function() {
  return this.exceptionText_;
};


/**
 * Set the exception text that is part of the log record.
 *
 * @param {string} text The exception text.
 */
goog.debug.LogRecord.prototype.setExceptionText = function(text) {
  this.exceptionText_ = text;
};


/**
 * Get the source Logger's name.
 *
 * @param {string} loggerName source logger name (may be null).
 */
goog.debug.LogRecord.prototype.setLoggerName = function(loggerName) {
  this.loggerName_ = loggerName;
};


/**
 * Get the logging message level, for example Level.SEVERE.
 * @return {goog.debug.Logger.Level} the logging message level.
 */
goog.debug.LogRecord.prototype.getLevel = function() {
  return this.level_;
};


/**
 * Set the logging message level, for example Level.SEVERE.
 * @param {goog.debug.Logger.Level} level the logging message level.
 */
goog.debug.LogRecord.prototype.setLevel = function(level) {
  this.level_ = level;
};


/**
 * Get the "raw" log message, before localization or formatting.
 *
 * @return {string} the raw message string.
 */
goog.debug.LogRecord.prototype.getMessage = function() {
  return this.msg_;
};


/**
 * Set the "raw" log message, before localization or formatting.
 *
 * @param {string} msg the raw message string.
 */
goog.debug.LogRecord.prototype.setMessage = function(msg) {
  this.msg_ = msg;
};


/**
 * Get event time in milliseconds since 1970.
 *
 * @return {number} event time in millis since 1970.
 */
goog.debug.LogRecord.prototype.getMillis = function() {
  return this.time_;
};


/**
 * Set event time in milliseconds since 1970.
 *
 * @param {number} time event time in millis since 1970.
 */
goog.debug.LogRecord.prototype.setMillis = function(time) {
  this.time_ = time;
};


/**
 * Get the sequence number.
 * <p>
 * Sequence numbers are normally assigned in the LogRecord
 * constructor, which assigns unique sequence numbers to
 * each new LogRecord in increasing order.
 * @return {number} the sequence number.
 */
goog.debug.LogRecord.prototype.getSequenceNumber = function() {
  return this.sequenceNumber_;
};

// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A buffer for log records. The purpose of this is to improve
 * logging performance by re-using old objects when the buffer becomes full and
 * to eliminate the need for each app to implement their own log buffer. The
 * disadvantage to doing this is that log handlers cannot maintain references to
 * log records and expect that they are not overwriten at a later point.
 *
 * @author agrieve@google.com (Andrew Grieve)
 */

goog.provide('goog.debug.LogBuffer');

goog.require('goog.asserts');
goog.require('goog.debug.LogRecord');



/**
 * Creates the log buffer.
 * @constructor
 */
goog.debug.LogBuffer = function() {
  goog.asserts.assert(goog.debug.LogBuffer.isBufferingEnabled(),
      'Cannot use goog.debug.LogBuffer without defining ' +
      'goog.debug.LogBuffer.CAPACITY.');
  this.clear();
};


/**
 * A static method that always returns the same instance of LogBuffer.
 * @return {!goog.debug.LogBuffer} The LogBuffer singleton instance.
 */
goog.debug.LogBuffer.getInstance = function() {
  if (!goog.debug.LogBuffer.instance_) {
    // This function is written with the return statement after the assignment
    // to avoid the jscompiler StripCode bug described in http://b/2608064.
    // After that bug is fixed this can be refactored.
    goog.debug.LogBuffer.instance_ = new goog.debug.LogBuffer();
  }
  return goog.debug.LogBuffer.instance_;
};


/**
 * @define {number} The number of log records to buffer. 0 means disable
 * buffering.
 */
goog.debug.LogBuffer.CAPACITY = 0;


/**
 * The array to store the records.
 * @type {!Array.<!goog.debug.LogRecord|undefined>}
 * @private
 */
goog.debug.LogBuffer.prototype.buffer_;


/**
 * The index of the most recently added record or -1 if there are no records.
 * @type {number}
 * @private
 */
goog.debug.LogBuffer.prototype.curIndex_;


/**
 * Whether the buffer is at capacity.
 * @type {boolean}
 * @private
 */
goog.debug.LogBuffer.prototype.isFull_;


/**
 * Adds a log record to the buffer, possibly overwriting the oldest record.
 * @param {goog.debug.Logger.Level} level One of the level identifiers.
 * @param {string} msg The string message.
 * @param {string} loggerName The name of the source logger.
 * @return {!goog.debug.LogRecord} The log record.
 */
goog.debug.LogBuffer.prototype.addRecord = function(level, msg, loggerName) {
  var curIndex = (this.curIndex_ + 1) % goog.debug.LogBuffer.CAPACITY;
  this.curIndex_ = curIndex;
  if (this.isFull_) {
    var ret = this.buffer_[curIndex];
    ret.reset(level, msg, loggerName);
    return ret;
  }
  this.isFull_ = curIndex == goog.debug.LogBuffer.CAPACITY - 1;
  return this.buffer_[curIndex] =
      new goog.debug.LogRecord(level, msg, loggerName);
};


/**
 * @return {boolean} Whether the log buffer is enabled.
 */
goog.debug.LogBuffer.isBufferingEnabled = function() {
  return goog.debug.LogBuffer.CAPACITY > 0;
};


/**
 * Removes all buffered log records.
 */
goog.debug.LogBuffer.prototype.clear = function() {
  this.buffer_ = new Array(goog.debug.LogBuffer.CAPACITY);
  this.curIndex_ = -1;
  this.isFull_ = false;
};


/**
 * Calls the given function for each buffered log record, starting with the
 * oldest one.
 * @param {function(!goog.debug.LogRecord)} func The function to call.
 */
goog.debug.LogBuffer.prototype.forEachRecord = function(func) {
  var buffer = this.buffer_;
  // Corner case: no records.
  if (!buffer[0]) {
    return;
  }
  var curIndex = this.curIndex_;
  var i = this.isFull_ ? curIndex : -1;
  do {
    i = (i + 1) % goog.debug.LogBuffer.CAPACITY;
    func(/** @type {!goog.debug.LogRecord} */ (buffer[i]));
  } while (i != curIndex);
};

// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Definition of the Logger class. Please minimize dependencies
 * this file has on other closure classes as any dependency it takes won't be
 * able to use the logging infrastructure.
 *
 * @see ../demos/debug.html
 */

goog.provide('goog.debug.LogManager');
goog.provide('goog.debug.Logger');
goog.provide('goog.debug.Logger.Level');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.debug');
goog.require('goog.debug.LogBuffer');
goog.require('goog.debug.LogRecord');



/**
 * The Logger is an object used for logging debug messages. Loggers are
 * normally named, using a hierarchical dot-separated namespace. Logger names
 * can be arbitrary strings, but they should normally be based on the package
 * name or class name of the logged component, such as goog.net.BrowserChannel.
 *
 * The Logger object is loosely based on the java class
 * java.util.logging.Logger. It supports different levels of filtering for
 * different loggers.
 *
 * The logger object should never be instantiated by application code. It
 * should always use the goog.debug.Logger.getLogger function.
 *
 * @constructor
 * @param {string} name The name of the Logger.
 */
goog.debug.Logger = function(name) {
  /**
   * Name of the Logger. Generally a dot-separated namespace
   * @type {string}
   * @private
   */
  this.name_ = name;
};


/**
 * Parent Logger.
 * @type {goog.debug.Logger}
 * @private
 */
goog.debug.Logger.prototype.parent_ = null;


/**
 * Level that this logger only filters above. Null indicates it should
 * inherit from the parent.
 * @type {goog.debug.Logger.Level}
 * @private
 */
goog.debug.Logger.prototype.level_ = null;


/**
 * Map of children loggers. The keys are the leaf names of the children and
 * the values are the child loggers.
 * @type {Object}
 * @private
 */
goog.debug.Logger.prototype.children_ = null;


/**
 * Handlers that are listening to this logger.
 * @type {Array.<Function>}
 * @private
 */
goog.debug.Logger.prototype.handlers_ = null;


/**
 * @define {boolean} Toggles whether loggers other than the root logger can have
 *     log handlers attached to them and whether they can have their log level
 *     set. Logging is a bit faster when this is set to false.
 */
goog.debug.Logger.ENABLE_HIERARCHY = true;


if (!goog.debug.Logger.ENABLE_HIERARCHY) {
  /**
   * @type {!Array.<Function>}
   * @private
   */
  goog.debug.Logger.rootHandlers_ = [];


  /**
   * @type {goog.debug.Logger.Level}
   * @private
   */
  goog.debug.Logger.rootLevel_;
}



/**
 * The Level class defines a set of standard logging levels that
 * can be used to control logging output.  The logging Level objects
 * are ordered and are specified by ordered integers.  Enabling logging
 * at a given level also enables logging at all higher levels.
 * <p>
 * Clients should normally use the predefined Level constants such
 * as Level.SEVERE.
 * <p>
 * The levels in descending order are:
 * <ul>
 * <li>SEVERE (highest value)
 * <li>WARNING
 * <li>INFO
 * <li>CONFIG
 * <li>FINE
 * <li>FINER
 * <li>FINEST  (lowest value)
 * </ul>
 * In addition there is a level OFF that can be used to turn
 * off logging, and a level ALL that can be used to enable
 * logging of all messages.
 *
 * @param {string} name The name of the level.
 * @param {number} value The numeric value of the level.
 * @constructor
 */
goog.debug.Logger.Level = function(name, value) {
  /**
   * The name of the level
   * @type {string}
   */
  this.name = name;

  /**
   * The numeric value of the level
   * @type {number}
   */
  this.value = value;
};


/**
 * @return {string} String representation of the logger level.
 */
goog.debug.Logger.Level.prototype.toString = function() {
  return this.name;
};


/**
 * OFF is a special level that can be used to turn off logging.
 * This level is initialized to <CODE>Number.MAX_VALUE</CODE>.
 * @type {!goog.debug.Logger.Level}
 */
goog.debug.Logger.Level.OFF =
    new goog.debug.Logger.Level('OFF', Infinity);


/**
 * SHOUT is a message level for extra debugging loudness.
 * This level is initialized to <CODE>1200</CODE>.
 * @type {!goog.debug.Logger.Level}
 */
goog.debug.Logger.Level.SHOUT = new goog.debug.Logger.Level('SHOUT', 1200);


/**
 * SEVERE is a message level indicating a serious failure.
 * This level is initialized to <CODE>1000</CODE>.
 * @type {!goog.debug.Logger.Level}
 */
goog.debug.Logger.Level.SEVERE = new goog.debug.Logger.Level('SEVERE', 1000);


/**
 * WARNING is a message level indicating a potential problem.
 * This level is initialized to <CODE>900</CODE>.
 * @type {!goog.debug.Logger.Level}
 */
goog.debug.Logger.Level.WARNING = new goog.debug.Logger.Level('WARNING', 900);


/**
 * INFO is a message level for informational messages.
 * This level is initialized to <CODE>800</CODE>.
 * @type {!goog.debug.Logger.Level}
 */
goog.debug.Logger.Level.INFO = new goog.debug.Logger.Level('INFO', 800);


/**
 * CONFIG is a message level for static configuration messages.
 * This level is initialized to <CODE>700</CODE>.
 * @type {!goog.debug.Logger.Level}
 */
goog.debug.Logger.Level.CONFIG = new goog.debug.Logger.Level('CONFIG', 700);


/**
 * FINE is a message level providing tracing information.
 * This level is initialized to <CODE>500</CODE>.
 * @type {!goog.debug.Logger.Level}
 */
goog.debug.Logger.Level.FINE = new goog.debug.Logger.Level('FINE', 500);


/**
 * FINER indicates a fairly detailed tracing message.
 * This level is initialized to <CODE>400</CODE>.
 * @type {!goog.debug.Logger.Level}
 */
goog.debug.Logger.Level.FINER = new goog.debug.Logger.Level('FINER', 400);

/**
 * FINEST indicates a highly detailed tracing message.
 * This level is initialized to <CODE>300</CODE>.
 * @type {!goog.debug.Logger.Level}
 */

goog.debug.Logger.Level.FINEST = new goog.debug.Logger.Level('FINEST', 300);


/**
 * ALL indicates that all messages should be logged.
 * This level is initialized to <CODE>Number.MIN_VALUE</CODE>.
 * @type {!goog.debug.Logger.Level}
 */
goog.debug.Logger.Level.ALL = new goog.debug.Logger.Level('ALL', 0);


/**
 * The predefined levels.
 * @type {!Array.<!goog.debug.Logger.Level>}
 * @final
 */
goog.debug.Logger.Level.PREDEFINED_LEVELS = [
  goog.debug.Logger.Level.OFF,
  goog.debug.Logger.Level.SHOUT,
  goog.debug.Logger.Level.SEVERE,
  goog.debug.Logger.Level.WARNING,
  goog.debug.Logger.Level.INFO,
  goog.debug.Logger.Level.CONFIG,
  goog.debug.Logger.Level.FINE,
  goog.debug.Logger.Level.FINER,
  goog.debug.Logger.Level.FINEST,
  goog.debug.Logger.Level.ALL];


/**
 * A lookup map used to find the level object based on the name or value of
 * the level object.
 * @type {Object}
 * @private
 */
goog.debug.Logger.Level.predefinedLevelsCache_ = null;


/**
 * Creates the predefined levels cache and populates it.
 * @private
 */
goog.debug.Logger.Level.createPredefinedLevelsCache_ = function() {
  goog.debug.Logger.Level.predefinedLevelsCache_ = {};
  for (var i = 0, level; level = goog.debug.Logger.Level.PREDEFINED_LEVELS[i];
       i++) {
    goog.debug.Logger.Level.predefinedLevelsCache_[level.value] = level;
    goog.debug.Logger.Level.predefinedLevelsCache_[level.name] = level;
  }
};


/**
 * Gets the predefined level with the given name.
 * @param {string} name The name of the level.
 * @return {goog.debug.Logger.Level} The level, or null if none found.
 */
goog.debug.Logger.Level.getPredefinedLevel = function(name) {
  if (!goog.debug.Logger.Level.predefinedLevelsCache_) {
    goog.debug.Logger.Level.createPredefinedLevelsCache_();
  }

  return goog.debug.Logger.Level.predefinedLevelsCache_[name] || null;
};


/**
 * Gets the highest predefined level <= #value.
 * @param {number} value Level value.
 * @return {goog.debug.Logger.Level} The level, or null if none found.
 */
goog.debug.Logger.Level.getPredefinedLevelByValue = function(value) {
  if (!goog.debug.Logger.Level.predefinedLevelsCache_) {
    goog.debug.Logger.Level.createPredefinedLevelsCache_();
  }

  if (value in goog.debug.Logger.Level.predefinedLevelsCache_) {
    return goog.debug.Logger.Level.predefinedLevelsCache_[value];
  }

  for (var i = 0; i < goog.debug.Logger.Level.PREDEFINED_LEVELS.length; ++i) {
    var level = goog.debug.Logger.Level.PREDEFINED_LEVELS[i];
    if (level.value <= value) {
      return level;
    }
  }
  return null;
};


/**
 * Find or create a logger for a named subsystem. If a logger has already been
 * created with the given name it is returned. Otherwise a new logger is
 * created. If a new logger is created its log level will be configured based
 * on the LogManager configuration and it will configured to also send logging
 * output to its parent's handlers. It will be registered in the LogManager
 * global namespace.
 *
 * @param {string} name A name for the logger. This should be a dot-separated
 * name and should normally be based on the package name or class name of the
 * subsystem, such as goog.net.BrowserChannel.
 * @return {!goog.debug.Logger} The named logger.
 */
goog.debug.Logger.getLogger = function(name) {
  return goog.debug.LogManager.getLogger(name);
};


/**
 * Logs a message to profiling tools, if available.
 * {@see http://code.google.com/webtoolkit/speedtracer/logging-api.html}
 * {@see http://msdn.microsoft.com/en-us/library/dd433074(VS.85).aspx}
 * @param {string} msg The message to log.
 */
goog.debug.Logger.logToProfilers = function(msg) {
  // Using goog.global, as loggers might be used in window-less contexts.
  if (goog.global['console']) {
    if (goog.global['console']['timeStamp']) {
      // Logs a message to Firebug, Web Inspector, SpeedTracer, etc.
      goog.global['console']['timeStamp'](msg);
    } else if (goog.global['console']['markTimeline']) {
      // TODO(user): markTimeline is deprecated. Drop this else clause entirely
      // after Chrome M14 hits stable.
      goog.global['console']['markTimeline'](msg);
    }
  }

  if (goog.global['msWriteProfilerMark']) {
    // Logs a message to the Microsoft profiler
    goog.global['msWriteProfilerMark'](msg);
  }
};


/**
 * Gets the name of this logger.
 * @return {string} The name of this logger.
 */
goog.debug.Logger.prototype.getName = function() {
  return this.name_;
};


/**
 * Adds a handler to the logger. This doesn't use the event system because
 * we want to be able to add logging to the event system.
 * @param {Function} handler Handler function to add.
 */
goog.debug.Logger.prototype.addHandler = function(handler) {
  if (goog.debug.Logger.ENABLE_HIERARCHY) {
    if (!this.handlers_) {
      this.handlers_ = [];
    }
    this.handlers_.push(handler);
  } else {
    goog.asserts.assert(!this.name_,
        'Cannot call addHandler on a non-root logger when ' +
        'goog.debug.Logger.ENABLE_HIERARCHY is false.');
    goog.debug.Logger.rootHandlers_.push(handler);
  }
};


/**
 * Removes a handler from the logger. This doesn't use the event system because
 * we want to be able to add logging to the event system.
 * @param {Function} handler Handler function to remove.
 * @return {boolean} Whether the handler was removed.
 */
goog.debug.Logger.prototype.removeHandler = function(handler) {
  var handlers = goog.debug.Logger.ENABLE_HIERARCHY ? this.handlers_ :
      goog.debug.Logger.rootHandlers_;
  return !!handlers && goog.array.remove(handlers, handler);
};


/**
 * Returns the parent of this logger.
 * @return {goog.debug.Logger} The parent logger or null if this is the root.
 */
goog.debug.Logger.prototype.getParent = function() {
  return this.parent_;
};


/**
 * Returns the children of this logger as a map of the child name to the logger.
 * @return {!Object} The map where the keys are the child leaf names and the
 *     values are the Logger objects.
 */
goog.debug.Logger.prototype.getChildren = function() {
  if (!this.children_) {
    this.children_ = {};
  }
  return this.children_;
};


/**
 * Set the log level specifying which message levels will be logged by this
 * logger. Message levels lower than this value will be discarded.
 * The level value Level.OFF can be used to turn off logging. If the new level
 * is null, it means that this node should inherit its level from its nearest
 * ancestor with a specific (non-null) level value.
 *
 * @param {goog.debug.Logger.Level} level The new level.
 */
goog.debug.Logger.prototype.setLevel = function(level) {
  if (goog.debug.Logger.ENABLE_HIERARCHY) {
    this.level_ = level;
  } else {
    goog.asserts.assert(!this.name_,
        'Cannot call setLevel() on a non-root logger when ' +
        'goog.debug.Logger.ENABLE_HIERARCHY is false.');
    goog.debug.Logger.rootLevel_ = level;
  }
};


/**
 * Gets the log level specifying which message levels will be logged by this
 * logger. Message levels lower than this value will be discarded.
 * The level value Level.OFF can be used to turn off logging. If the level
 * is null, it means that this node should inherit its level from its nearest
 * ancestor with a specific (non-null) level value.
 *
 * @return {goog.debug.Logger.Level} The level.
 */
goog.debug.Logger.prototype.getLevel = function() {
  return this.level_;
};


/**
 * Returns the effective level of the logger based on its ancestors' levels.
 * @return {goog.debug.Logger.Level} The level.
 */
goog.debug.Logger.prototype.getEffectiveLevel = function() {
  if (!goog.debug.Logger.ENABLE_HIERARCHY) {
    return goog.debug.Logger.rootLevel_;
  }
  if (this.level_) {
    return this.level_;
  }
  if (this.parent_) {
    return this.parent_.getEffectiveLevel();
  }
  goog.asserts.fail('Root logger has no level set.');
  return null;
};


/**
 * Check if a message of the given level would actually be logged by this
 * logger. This check is based on the Loggers effective level, which may be
 * inherited from its parent.
 * @param {goog.debug.Logger.Level} level The level to check.
 * @return {boolean} Whether the message would be logged.
 */
goog.debug.Logger.prototype.isLoggable = function(level) {
  return level.value >= this.getEffectiveLevel().value;
};


/**
 * Log a message. If the logger is currently enabled for the
 * given message level then the given message is forwarded to all the
 * registered output Handler objects.
 * @param {goog.debug.Logger.Level} level One of the level identifiers.
 * @param {string} msg The string message.
 * @param {Error|Object=} opt_exception An exception associated with the
 *     message.
 */
goog.debug.Logger.prototype.log = function(level, msg, opt_exception) {
  // java caches the effective level, not sure it's necessary here
  if (this.isLoggable(level)) {
    this.doLogRecord_(this.getLogRecord(level, msg, opt_exception));
  }
};


/**
 * Creates a new log record and adds the exception (if present) to it.
 * @param {goog.debug.Logger.Level} level One of the level identifiers.
 * @param {string} msg The string message.
 * @param {Error|Object=} opt_exception An exception associated with the
 *     message.
 * @return {!goog.debug.LogRecord} A log record.
 */
goog.debug.Logger.prototype.getLogRecord = function(level, msg, opt_exception) {
  if (goog.debug.LogBuffer.isBufferingEnabled()) {
    var logRecord =
        goog.debug.LogBuffer.getInstance().addRecord(level, msg, this.name_);
  } else {
    logRecord = new goog.debug.LogRecord(level, String(msg), this.name_);
  }
  if (opt_exception) {
    logRecord.setException(opt_exception);
    logRecord.setExceptionText(
        goog.debug.exposeException(opt_exception, arguments.callee.caller));
  }
  return logRecord;
};


/**
 * Log a message at the Logger.Level.SHOUT level.
 * If the logger is currently enabled for the given message level then the
 * given message is forwarded to all the registered output Handler objects.
 * @param {string} msg The string message.
 * @param {Error=} opt_exception An exception associated with the message.
 */
goog.debug.Logger.prototype.shout = function(msg, opt_exception) {
  this.log(goog.debug.Logger.Level.SHOUT, msg, opt_exception);
};


/**
 * Log a message at the Logger.Level.SEVERE level.
 * If the logger is currently enabled for the given message level then the
 * given message is forwarded to all the registered output Handler objects.
 * @param {string} msg The string message.
 * @param {Error=} opt_exception An exception associated with the message.
 */
goog.debug.Logger.prototype.severe = function(msg, opt_exception) {
  this.log(goog.debug.Logger.Level.SEVERE, msg, opt_exception);
};


/**
 * Log a message at the Logger.Level.WARNING level.
 * If the logger is currently enabled for the given message level then the
 * given message is forwarded to all the registered output Handler objects.
 * @param {string} msg The string message.
 * @param {Error=} opt_exception An exception associated with the message.
 */
goog.debug.Logger.prototype.warning = function(msg, opt_exception) {
  this.log(goog.debug.Logger.Level.WARNING, msg, opt_exception);
};


/**
 * Log a message at the Logger.Level.INFO level.
 * If the logger is currently enabled for the given message level then the
 * given message is forwarded to all the registered output Handler objects.
 * @param {string} msg The string message.
 * @param {Error=} opt_exception An exception associated with the message.
 */
goog.debug.Logger.prototype.info = function(msg, opt_exception) {
  this.log(goog.debug.Logger.Level.INFO, msg, opt_exception);
};


/**
 * Log a message at the Logger.Level.CONFIG level.
 * If the logger is currently enabled for the given message level then the
 * given message is forwarded to all the registered output Handler objects.
 * @param {string} msg The string message.
 * @param {Error=} opt_exception An exception associated with the message.
 */
goog.debug.Logger.prototype.config = function(msg, opt_exception) {
  this.log(goog.debug.Logger.Level.CONFIG, msg, opt_exception);
};


/**
 * Log a message at the Logger.Level.FINE level.
 * If the logger is currently enabled for the given message level then the
 * given message is forwarded to all the registered output Handler objects.
 * @param {string} msg The string message.
 * @param {Error=} opt_exception An exception associated with the message.
 */
goog.debug.Logger.prototype.fine = function(msg, opt_exception) {
  this.log(goog.debug.Logger.Level.FINE, msg, opt_exception);
};


/**
 * Log a message at the Logger.Level.FINER level.
 * If the logger is currently enabled for the given message level then the
 * given message is forwarded to all the registered output Handler objects.
 * @param {string} msg The string message.
 * @param {Error=} opt_exception An exception associated with the message.
 */
goog.debug.Logger.prototype.finer = function(msg, opt_exception) {
  this.log(goog.debug.Logger.Level.FINER, msg, opt_exception);
};


/**
 * Log a message at the Logger.Level.FINEST level.
 * If the logger is currently enabled for the given message level then the
 * given message is forwarded to all the registered output Handler objects.
 * @param {string} msg The string message.
 * @param {Error=} opt_exception An exception associated with the message.
 */
goog.debug.Logger.prototype.finest = function(msg, opt_exception) {
  this.log(goog.debug.Logger.Level.FINEST, msg, opt_exception);
};


/**
 * Log a LogRecord. If the logger is currently enabled for the
 * given message level then the given message is forwarded to all the
 * registered output Handler objects.
 * @param {goog.debug.LogRecord} logRecord A log record to log.
 */
goog.debug.Logger.prototype.logRecord = function(logRecord) {
  if (this.isLoggable(logRecord.getLevel())) {
    this.doLogRecord_(logRecord);
  }
};


/**
 * Log a LogRecord.
 * @param {goog.debug.LogRecord} logRecord A log record to log.
 * @private
 */
goog.debug.Logger.prototype.doLogRecord_ = function(logRecord) {
  goog.debug.Logger.logToProfilers('log:' + logRecord.getMessage());
  if (goog.debug.Logger.ENABLE_HIERARCHY) {
    var target = this;
    while (target) {
      target.callPublish_(logRecord);
      target = target.getParent();
    }
  } else {
    for (var i = 0, handler; handler = goog.debug.Logger.rootHandlers_[i++]; ) {
      handler(logRecord);
    }
  }
};


/**
 * Calls the handlers for publish.
 * @param {goog.debug.LogRecord} logRecord The log record to publish.
 * @private
 */
goog.debug.Logger.prototype.callPublish_ = function(logRecord) {
  if (this.handlers_) {
    for (var i = 0, handler; handler = this.handlers_[i]; i++) {
      handler(logRecord);
    }
  }
};


/**
 * Sets the parent of this logger. This is used for setting up the logger tree.
 * @param {goog.debug.Logger} parent The parent logger.
 * @private
 */
goog.debug.Logger.prototype.setParent_ = function(parent) {
  this.parent_ = parent;
};


/**
 * Adds a child to this logger. This is used for setting up the logger tree.
 * @param {string} name The leaf name of the child.
 * @param {goog.debug.Logger} logger The child logger.
 * @private
 */
goog.debug.Logger.prototype.addChild_ = function(name, logger) {
  this.getChildren()[name] = logger;
};


/**
 * There is a single global LogManager object that is used to maintain a set of
 * shared state about Loggers and log services. This is loosely based on the
 * java class java.util.logging.LogManager.
 */
goog.debug.LogManager = {};


/**
 * Map of logger names to logger objects
 *
 * @type {!Object}
 * @private
 */
goog.debug.LogManager.loggers_ = {};


/**
 * The root logger which is the root of the logger tree.
 * @type {goog.debug.Logger}
 * @private
 */
goog.debug.LogManager.rootLogger_ = null;


/**
 * Initialize the LogManager if not already initialized
 */
goog.debug.LogManager.initialize = function() {
  if (!goog.debug.LogManager.rootLogger_) {
    goog.debug.LogManager.rootLogger_ = new goog.debug.Logger('');
    goog.debug.LogManager.loggers_[''] = goog.debug.LogManager.rootLogger_;
    goog.debug.LogManager.rootLogger_.setLevel(goog.debug.Logger.Level.CONFIG);
  }
};


/**
 * Returns all the loggers
 * @return {!Object} Map of logger names to logger objects.
 */
goog.debug.LogManager.getLoggers = function() {
  return goog.debug.LogManager.loggers_;
};


/**
 * Returns the root of the logger tree namespace, the logger with the empty
 * string as its name
 *
 * @return {!goog.debug.Logger} The root logger.
 */
goog.debug.LogManager.getRoot = function() {
  goog.debug.LogManager.initialize();
  return /** @type {!goog.debug.Logger} */ (goog.debug.LogManager.rootLogger_);
};


/**
 * Method to find a named logger.
 *
 * @param {string} name A name for the logger. This should be a dot-separated
 * name and should normally be based on the package name or class name of the
 * subsystem, such as goog.net.BrowserChannel.
 * @return {!goog.debug.Logger} The named logger.
 */
goog.debug.LogManager.getLogger = function(name) {
  goog.debug.LogManager.initialize();
  var ret = goog.debug.LogManager.loggers_[name];
  return ret || goog.debug.LogManager.createLogger_(name);
};


/**
 * Creates a function that can be passed to goog.debug.catchErrors. The function
 * will log all reported errors using the given logger.
 * @param {goog.debug.Logger=} opt_logger The logger to log the errors to.
 *     Defaults to the root logger.
 * @return {function(Object)} The created function.
 */
goog.debug.LogManager.createFunctionForCatchErrors = function(opt_logger) {
  return function(info) {
    var logger = opt_logger || goog.debug.LogManager.getRoot();
    logger.severe('Error: ' + info.message + ' (' + info.fileName +
                  ' @ Line: ' + info.line + ')');
  };
};


/**
 * Creates the named logger. Will also create the parents of the named logger
 * if they don't yet exist.
 * @param {string} name The name of the logger.
 * @return {!goog.debug.Logger} The named logger.
 * @private
 */
goog.debug.LogManager.createLogger_ = function(name) {
  // find parent logger
  var logger = new goog.debug.Logger(name);
  if (goog.debug.Logger.ENABLE_HIERARCHY) {
    var lastDotIndex = name.lastIndexOf('.');
    var parentName = name.substr(0, lastDotIndex);
    var leafName = name.substr(lastDotIndex + 1);
    var parentLogger = goog.debug.LogManager.getLogger(parentName);

    // tell the parent about the child and the child about the parent
    parentLogger.addChild_(leafName, logger);
    logger.setParent_(parentLogger);
  }

  goog.debug.LogManager.loggers_[name] = logger;
  return logger;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview JSON utility functions.
 * @author arv@google.com (Erik Arvidsson)
 */


goog.provide('goog.json');
goog.provide('goog.json.Serializer');


/**
 * Tests if a string is an invalid JSON string. This only ensures that we are
 * not using any invalid characters
 * @param {string} s The string to test.
 * @return {boolean} True if the input is a valid JSON string.
 * @private
 */
goog.json.isValid_ = function(s) {
  // All empty whitespace is not valid.
  if (/^\s*$/.test(s)) {
    return false;
  }

  // This is taken from http://www.json.org/json2.js which is released to the
  // public domain.
  // Changes: We dissallow \u2028 Line separator and \u2029 Paragraph separator
  // inside strings.  We also treat \u2028 and \u2029 as whitespace which they
  // are in the RFC but IE and Safari does not match \s to these so we need to
  // include them in the reg exps in all places where whitespace is allowed.
  // We allowed \x7f inside strings because some tools don't escape it,
  // e.g. http://www.json.org/java/org/json/JSONObject.java

  // Parsing happens in three stages. In the first stage, we run the text
  // against regular expressions that look for non-JSON patterns. We are
  // especially concerned with '()' and 'new' because they can cause invocation,
  // and '=' because it can cause mutation. But just to be safe, we want to
  // reject all unexpected forms.

  // We split the first stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace all backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

  // Don't make these static since they have the global flag.
  var backslashesRe = /\\["\\\/bfnrtu]/g;
  var simpleValuesRe =
      /"[^"\\\n\r\u2028\u2029\x00-\x08\x10-\x1f\x80-\x9f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
  var openBracketsRe = /(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g;
  var remainderRe = /^[\],:{}\s\u2028\u2029]*$/;

  return remainderRe.test(s.replace(backslashesRe, '@').
      replace(simpleValuesRe, ']').
      replace(openBracketsRe, ''));
};


/**
 * Parses a JSON string and returns the result. This throws an exception if
 * the string is an invalid JSON string.
 *
 * Note that this is very slow on large strings. If you trust the source of
 * the string then you should use unsafeParse instead.
 *
 * @param {*} s The JSON string to parse.
 * @return {Object} The object generated from the JSON string.
 */
goog.json.parse = function(s) {
  var o = String(s);
  if (goog.json.isValid_(o)) {
    /** @preserveTry */
    try {
      return /** @type {Object} */ (eval('(' + o + ')'));
    } catch (ex) {
    }
  }
  throw Error('Invalid JSON string: ' + o);
};


/**
 * Parses a JSON string and returns the result. This uses eval so it is open
 * to security issues and it should only be used if you trust the source.
 *
 * @param {string} s The JSON string to parse.
 * @return {Object} The object generated from the JSON string.
 */
goog.json.unsafeParse = function(s) {
  return /** @type {Object} */ (eval('(' + s + ')'));
};


/**
 * JSON replacer, as defined in Section 15.12.3 of the ES5 spec.
 *
 * TODO(nicksantos): Array should also be a valid replacer.
 *
 * @typedef {function(this:Object, string, *): *}
 */
goog.json.Replacer;


/**
 * Serializes an object or a value to a JSON string.
 *
 * @param {*} object The object to serialize.
 * @param {?goog.json.Replacer=} opt_replacer A replacer function
 *     called for each (key, value) pair that determines how the value
 *     should be serialized. By defult, this just returns the value
 *     and allows default serialization to kick in.
 * @throws Error if there are loops in the object graph.
 * @return {string} A JSON string representation of the input.
 */
goog.json.serialize = function(object, opt_replacer) {
  // TODO(nicksantos): Change this to default to JSON.stringify when available.
  // I need to fiddle with the default externs a bit to make this happen.
  return new goog.json.Serializer(opt_replacer).serialize(object);
};



/**
 * Class that is used to serialize JSON objects to a string.
 * @param {?goog.json.Replacer=} opt_replacer Replacer.
 * @constructor
 */
goog.json.Serializer = function(opt_replacer) {
  /**
   * @type {goog.json.Replacer|null|undefined}
   * @private
   */
  this.replacer_ = opt_replacer;
};


/**
 * Serializes an object or a value to a JSON string.
 *
 * @param {*} object The object to serialize.
 * @throws Error if there are loops in the object graph.
 * @return {string} A JSON string representation of the input.
 */
goog.json.Serializer.prototype.serialize = function(object) {
  var sb = [];
  this.serialize_(object, sb);
  return sb.join('');
};


/**
 * Serializes a generic value to a JSON string
 * @private
 * @param {*} object The object to serialize.
 * @param {Array} sb Array used as a string builder.
 * @throws Error if there are loops in the object graph.
 */
goog.json.Serializer.prototype.serialize_ = function(object, sb) {
  switch (typeof object) {
    case 'string':
      this.serializeString_((/** @type {string} */ object), sb);
      break;
    case 'number':
      this.serializeNumber_((/** @type {number} */ object), sb);
      break;
    case 'boolean':
      sb.push(object);
      break;
    case 'undefined':
      sb.push('null');
      break;
    case 'object':
      if (object == null) {
        sb.push('null');
        break;
      }
      if (goog.isArray(object)) {
        this.serializeArray_((/** @type {!Array} */ object), sb);
        break;
      }
      // should we allow new String, new Number and new Boolean to be treated
      // as string, number and boolean? Most implementations do not and the
      // need is not very big
      this.serializeObject_((/** @type {Object} */ object), sb);
      break;
    case 'function':
      // Skip functions.
      // TODO(user) Should we return something here?
      break;
    default:
      throw Error('Unknown type: ' + typeof object);
  }
};


/**
 * Character mappings used internally for goog.string.quote
 * @private
 * @type {Object}
 */
goog.json.Serializer.charToJsonCharCache_ = {
  '\"': '\\"',
  '\\': '\\\\',
  '/': '\\/',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',

  '\x0B': '\\u000b' // '\v' is not supported in JScript
};


/**
 * Regular expression used to match characters that need to be replaced.
 * The S60 browser has a bug where unicode characters are not matched by
 * regular expressions. The condition below detects such behaviour and
 * adjusts the regular expression accordingly.
 * @private
 * @type {RegExp}
 */
goog.json.Serializer.charsToReplace_ = /\uffff/.test('\uffff') ?
    /[\\\"\x00-\x1f\x7f-\uffff]/g : /[\\\"\x00-\x1f\x7f-\xff]/g;


/**
 * Serializes a string to a JSON string
 * @private
 * @param {string} s The string to serialize.
 * @param {Array} sb Array used as a string builder.
 */
goog.json.Serializer.prototype.serializeString_ = function(s, sb) {
  // The official JSON implementation does not work with international
  // characters.
  sb.push('"', s.replace(goog.json.Serializer.charsToReplace_, function(c) {
    // caching the result improves performance by a factor 2-3
    if (c in goog.json.Serializer.charToJsonCharCache_) {
      return goog.json.Serializer.charToJsonCharCache_[c];
    }

    var cc = c.charCodeAt(0);
    var rv = '\\u';
    if (cc < 16) {
      rv += '000';
    } else if (cc < 256) {
      rv += '00';
    } else if (cc < 4096) { // \u1000
      rv += '0';
    }
    return goog.json.Serializer.charToJsonCharCache_[c] = rv + cc.toString(16);
  }), '"');
};


/**
 * Serializes a number to a JSON string
 * @private
 * @param {number} n The number to serialize.
 * @param {Array} sb Array used as a string builder.
 */
goog.json.Serializer.prototype.serializeNumber_ = function(n, sb) {
  sb.push(isFinite(n) && !isNaN(n) ? n : 'null');
};


/**
 * Serializes an array to a JSON string
 * @private
 * @param {Array} arr The array to serialize.
 * @param {Array} sb Array used as a string builder.
 */
goog.json.Serializer.prototype.serializeArray_ = function(arr, sb) {
  var l = arr.length;
  sb.push('[');
  var sep = '';
  for (var i = 0; i < l; i++) {
    sb.push(sep);

    var value = arr[i];
    this.serialize_(
        this.replacer_ ? this.replacer_.call(arr, String(i), value) : value,
        sb);

    sep = ',';
  }
  sb.push(']');
};


/**
 * Serializes an object to a JSON string
 * @private
 * @param {Object} obj The object to serialize.
 * @param {Array} sb Array used as a string builder.
 */
goog.json.Serializer.prototype.serializeObject_ = function(obj, sb) {
  sb.push('{');
  var sep = '';
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      var value = obj[key];
      // Skip functions.
      // TODO(ptucker) Should we return something for function properties?
      if (typeof value != 'function') {
        sb.push(sep);
        this.serializeString_(key, sb);
        sb.push(':');

        this.serialize_(
            this.replacer_ ? this.replacer_.call(obj, key, value) : value,
            sb);

        sep = ',';
      }
    }
  }
  sb.push('}');
};
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Error codes shared between goog.net.IframeIo and
 * goog.net.XhrIo.
 */

goog.provide('goog.net.ErrorCode');


/**
 * Error codes
 * @enum {number}
 */
goog.net.ErrorCode = {

  /**
   * There is no error condition.
   */
  NO_ERROR: 0,

  /**
   * The most common error from iframeio, unfortunately, is that the browser
   * responded with an error page that is classed as a different domain. The
   * situations, are when a browser error page  is shown -- 404, access denied,
   * DNS failure, connection reset etc.)
   *
   */
  ACCESS_DENIED: 1,

  /**
   * Currently the only case where file not found will be caused is when the
   * code is running on the local file system and a non-IE browser makes a
   * request to a file that doesn't exist.
   */
  FILE_NOT_FOUND: 2,

  /**
   * If Firefox shows a browser error page, such as a connection reset by
   * server or access denied, then it will fail silently without the error or
   * load handlers firing.
   */
  FF_SILENT_ERROR: 3,

  /**
   * Custom error provided by the client through the error check hook.
   */
  CUSTOM_ERROR: 4,

  /**
   * Exception was thrown while processing the request.
   */
  EXCEPTION: 5,

  /**
   * The Http response returned a non-successful http status code.
   */
  HTTP_ERROR: 6,

  /**
   * The request was aborted.
   */
  ABORT: 7,

  /**
   * The request timed out.
   */
  TIMEOUT: 8,

  /**
   * The resource is not available offline.
   */
  OFFLINE: 9
};


/**
 * Returns a friendly error message for an error code. These messages are for
 * debugging and are not localized.
 * @param {goog.net.ErrorCode} errorCode An error code.
 * @return {string} A message for debugging.
 */
goog.net.ErrorCode.getDebugMessage = function(errorCode) {
  switch (errorCode) {
    case goog.net.ErrorCode.NO_ERROR:
      return 'No Error';

    case goog.net.ErrorCode.ACCESS_DENIED:
      return 'Access denied to content document';

    case goog.net.ErrorCode.FILE_NOT_FOUND:
      return 'File not found';

    case goog.net.ErrorCode.FF_SILENT_ERROR:
      return 'Firefox silently errored';

    case goog.net.ErrorCode.CUSTOM_ERROR:
      return 'Application custom error';

    case goog.net.ErrorCode.EXCEPTION:
      return 'An exception occurred';

    case goog.net.ErrorCode.HTTP_ERROR:
      return 'Http response at 400 or 500 level';

    case goog.net.ErrorCode.ABORT:
      return 'Request was aborted';

    case goog.net.ErrorCode.TIMEOUT:
      return 'Request timed out';

    case goog.net.ErrorCode.OFFLINE:
      return 'The resource is not available offline';

    default:
      return 'Unrecognized error code';
  }
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Common events for the network classes.
 */


goog.provide('goog.net.EventType');


/**
 * Event names for network events
 * @enum {string}
 */
goog.net.EventType = {
  COMPLETE: 'complete',
  SUCCESS: 'success',
  ERROR: 'error',
  ABORT: 'abort',
  READY: 'ready',
  READY_STATE_CHANGE: 'readystatechange',
  TIMEOUT: 'timeout',
  INCREMENTAL_DATA: 'incrementaldata',
  PROGRESS: 'progress'
};
// Copyright 2011 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Constants for HTTP status codes.
 */

goog.provide('goog.net.HttpStatus');


/**
 * HTTP Status Codes defined in RFC 2616.
 * @see http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
 * @enum {number}
 */
goog.net.HttpStatus = {
  // Informational 1xx
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,

  // Successful 2xx
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,

  // Redirection 3xx
  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  USE_PROXY: 305,
  TEMPORARY_REDIRECT: 307,

  // Client Error 4xx
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  REQUEST_ENTITY_TOO_LARGE: 413,
  REQUEST_URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  REQUEST_RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,

  // Server Error 5xx
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,

  /*
   * IE returns this code for 204 due to its use of URLMon, which returns this
   * code for 'Operation Aborted'. The status text is 'Unknown', the response
   * headers are ''. Known to occur on IE 6 on XP through IE9 on Win7.
   */
  QUIRK_IE_NO_CONTENT: 1223
};


/**
 * Returns whether the given status should be considered successful.
 *
 * Successful codes are OK (200), CREATED (201), ACCEPTED (202),
 * NO CONTENT (204), NOT MODIFIED (304), and IE's no content code (1223).
 *
 * @param {number} status The status code to test.
 * @return {boolean} Whether the status code should be considered successful.
 */
goog.net.HttpStatus.isSuccess = function(status) {
  switch (status) {
    case goog.net.HttpStatus.OK:
    case goog.net.HttpStatus.CREATED:
    case goog.net.HttpStatus.ACCEPTED:
    case goog.net.HttpStatus.NO_CONTENT:
    case goog.net.HttpStatus.NOT_MODIFIED:
    case goog.net.HttpStatus.QUIRK_IE_NO_CONTENT:
      return true;

    default:
      return false;
  }
};
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Interface for a factory for creating XMLHttpRequest objects
 * and metadata about them.
 * @author dbk@google.com (David Barrett-Kahn)
 */

goog.provide('goog.net.XmlHttpFactory');



/**
 * Abstract base class for an XmlHttpRequest factory.
 * @constructor
 */
goog.net.XmlHttpFactory = function() {
};


/**
 * Cache of options - we only actually call internalGetOptions once.
 * @type {Object}
 * @private
 */
goog.net.XmlHttpFactory.prototype.cachedOptions_ = null;


/**
 * @return {!(XMLHttpRequest|GearsHttpRequest)} A new XMLHttpRequest instance.
 */
goog.net.XmlHttpFactory.prototype.createInstance = goog.abstractMethod;


/**
 * @return {Object} Options describing how xhr objects obtained from this
 *     factory should be used.
 */
goog.net.XmlHttpFactory.prototype.getOptions = function() {
  return this.cachedOptions_ ||
      (this.cachedOptions_ = this.internalGetOptions());
};


/**
 * Override this method in subclasses to preserve the caching offered by
 * getOptions().
 * @return {Object} Options describing how xhr objects obtained from this
 *     factory should be used.
 * @protected
 */
goog.net.XmlHttpFactory.prototype.internalGetOptions = goog.abstractMethod;
// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Implementation of XmlHttpFactory which allows construction from
 * simple factory methods.
 * @author dbk@google.com (David Barrett-Kahn)
 */

goog.provide('goog.net.WrapperXmlHttpFactory');

goog.require('goog.net.XmlHttpFactory');



/**
 * An xhr factory subclass which can be constructed using two factory methods.
 * This exists partly to allow the preservation of goog.net.XmlHttp.setFactory()
 * with an unchanged signature.
 * @param {function() : !(XMLHttpRequest|GearsHttpRequest)} xhrFactory A
 *     function which returns a new XHR object.
 * @param {function() : !Object} optionsFactory A function which returns the
 *     options associated with xhr objects from this factory.
 * @extends {goog.net.XmlHttpFactory}
 * @constructor
 */
goog.net.WrapperXmlHttpFactory = function(xhrFactory, optionsFactory) {
  goog.net.XmlHttpFactory.call(this);

  /**
   * XHR factory method.
   * @type {function() : !(XMLHttpRequest|GearsHttpRequest)}
   * @private
   */
  this.xhrFactory_ = xhrFactory;

  /**
   * Options factory method.
   * @type {function() : !Object}
   * @private
   */
  this.optionsFactory_ = optionsFactory;
};
goog.inherits(goog.net.WrapperXmlHttpFactory, goog.net.XmlHttpFactory);


/** @override */
goog.net.WrapperXmlHttpFactory.prototype.createInstance = function() {
  return this.xhrFactory_();
};


/** @override */
goog.net.WrapperXmlHttpFactory.prototype.getOptions = function() {
  return this.optionsFactory_();
};

// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Low level handling of XMLHttpRequest.
 * @author arv@google.com (Erik Arvidsson)
 * @author dbk@google.com (David Barrett-Kahn)
 */

goog.provide('goog.net.DefaultXmlHttpFactory');
goog.provide('goog.net.XmlHttp');
goog.provide('goog.net.XmlHttp.OptionType');
goog.provide('goog.net.XmlHttp.ReadyState');

goog.require('goog.net.WrapperXmlHttpFactory');
goog.require('goog.net.XmlHttpFactory');


/**
 * Static class for creating XMLHttpRequest objects.
 * @return {!(XMLHttpRequest|GearsHttpRequest)} A new XMLHttpRequest object.
 */
goog.net.XmlHttp = function() {
  return goog.net.XmlHttp.factory_.createInstance();
};


/**
 * Gets the options to use with the XMLHttpRequest objects obtained using
 * the static methods.
 * @return {Object} The options.
 */
goog.net.XmlHttp.getOptions = function() {
  return goog.net.XmlHttp.factory_.getOptions();
};


/**
 * Type of options that an XmlHttp object can have.
 * @enum {number}
 */
goog.net.XmlHttp.OptionType = {
  /**
   * Whether a goog.nullFunction should be used to clear the onreadystatechange
   * handler instead of null.
   */
  USE_NULL_FUNCTION: 0,

  /**
   * NOTE(user): In IE if send() errors on a *local* request the readystate
   * is still changed to COMPLETE.  We need to ignore it and allow the
   * try/catch around send() to pick up the error.
   */
  LOCAL_REQUEST_ERROR: 1
};


/**
 * Status constants for XMLHTTP, matches:
 * http://msdn.microsoft.com/library/default.asp?url=/library/
 *   en-us/xmlsdk/html/0e6a34e4-f90c-489d-acff-cb44242fafc6.asp
 * @enum {number}
 */
goog.net.XmlHttp.ReadyState = {
  /**
   * Constant for when xmlhttprequest.readyState is uninitialized
   */
  UNINITIALIZED: 0,

  /**
   * Constant for when xmlhttprequest.readyState is loading.
   */
  LOADING: 1,

  /**
   * Constant for when xmlhttprequest.readyState is loaded.
   */
  LOADED: 2,

  /**
   * Constant for when xmlhttprequest.readyState is in an interactive state.
   */
  INTERACTIVE: 3,

  /**
   * Constant for when xmlhttprequest.readyState is completed
   */
  COMPLETE: 4
};


/**
 * The global factory instance for creating XMLHttpRequest objects.
 * @type {goog.net.XmlHttpFactory}
 * @private
 */
goog.net.XmlHttp.factory_;


/**
 * Sets the factories for creating XMLHttpRequest objects and their options.
 * @param {Function} factory The factory for XMLHttpRequest objects.
 * @param {Function} optionsFactory The factory for options.
 * @deprecated Use setGlobalFactory instead.
 */
goog.net.XmlHttp.setFactory = function(factory, optionsFactory) {
  goog.net.XmlHttp.setGlobalFactory(new goog.net.WrapperXmlHttpFactory(
      (/** @type {function() : !(XMLHttpRequest|GearsHttpRequest)} */ factory),
      (/** @type {function() : !Object}*/ optionsFactory)));
};


/**
 * Sets the global factory object.
 * @param {!goog.net.XmlHttpFactory} factory New global factory object.
 */
goog.net.XmlHttp.setGlobalFactory = function(factory) {
  goog.net.XmlHttp.factory_ = factory;
};



/**
 * Default factory to use when creating xhr objects.  You probably shouldn't be
 * instantiating this directly, but rather using it via goog.net.XmlHttp.
 * @extends {goog.net.XmlHttpFactory}
 * @constructor
 */
goog.net.DefaultXmlHttpFactory = function() {
  goog.net.XmlHttpFactory.call(this);
};
goog.inherits(goog.net.DefaultXmlHttpFactory, goog.net.XmlHttpFactory);


/** @override */
goog.net.DefaultXmlHttpFactory.prototype.createInstance = function() {
  var progId = this.getProgId_();
  if (progId) {
    return new ActiveXObject(progId);
  } else {
    return new XMLHttpRequest();
  }
};


/** @override */
goog.net.DefaultXmlHttpFactory.prototype.internalGetOptions = function() {
  var progId = this.getProgId_();
  var options = {};
  if (progId) {
    options[goog.net.XmlHttp.OptionType.USE_NULL_FUNCTION] = true;
    options[goog.net.XmlHttp.OptionType.LOCAL_REQUEST_ERROR] = true;
  }
  return options;
};


/**
 * The ActiveX PROG ID string to use to create xhr's in IE. Lazily initialized.
 * @type {?string}
 * @private
 */
goog.net.DefaultXmlHttpFactory.prototype.ieProgId_ = null;


/**
 * Initialize the private state used by other functions.
 * @return {string} The ActiveX PROG ID string to use to create xhr's in IE.
 * @private
 */
goog.net.DefaultXmlHttpFactory.prototype.getProgId_ = function() {
  // The following blog post describes what PROG IDs to use to create the
  // XMLHTTP object in Internet Explorer:
  // http://blogs.msdn.com/xmlteam/archive/2006/10/23/using-the-right-version-of-msxml-in-internet-explorer.aspx
  // However we do not (yet) fully trust that this will be OK for old versions
  // of IE on Win9x so we therefore keep the last 2.
  if (!this.ieProgId_ && typeof XMLHttpRequest == 'undefined' &&
      typeof ActiveXObject != 'undefined') {
    // Candidate Active X types.
    var ACTIVE_X_IDENTS = ['MSXML2.XMLHTTP.6.0', 'MSXML2.XMLHTTP.3.0',
                           'MSXML2.XMLHTTP', 'Microsoft.XMLHTTP'];
    for (var i = 0; i < ACTIVE_X_IDENTS.length; i++) {
      var candidate = ACTIVE_X_IDENTS[i];
      /** @preserveTry */
      try {
        new ActiveXObject(candidate);
        // NOTE(user): cannot assign progid and return candidate in one line
        // because JSCompiler complaings: BUG 658126
        this.ieProgId_ = candidate;
        return candidate;
      } catch (e) {
        // do nothing; try next choice
      }
    }

    // couldn't find any matches
    throw Error('Could not create ActiveXObject. ActiveX might be disabled,' +
                ' or MSXML might not be installed');
  }

  return /** @type {string} */ (this.ieProgId_);
};


//Set the global factory to an instance of the default factory.
goog.net.XmlHttp.setGlobalFactory(new goog.net.DefaultXmlHttpFactory());
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Simple utilities for dealing with URI strings.
 *
 * This is intended to be a lightweight alternative to constructing goog.Uri
 * objects.  Whereas goog.Uri adds several kilobytes to the binary regardless
 * of how much of its functionality you use, this is designed to be a set of
 * mostly-independent utilities so that the compiler includes only what is
 * necessary for the task.  Estimated savings of porting is 5k pre-gzip and
 * 1.5k post-gzip.  To ensure the savings remain, future developers should
 * avoid adding new functionality to existing functions, but instead create
 * new ones and factor out shared code.
 *
 * Many of these utilities have limited functionality, tailored to common
 * cases.  The query parameter utilities assume that the parameter keys are
 * already encoded, since most keys are compile-time alphanumeric strings.  The
 * query parameter mutation utilities also do not tolerate fragment identifiers.
 *
 * By design, these functions can be slower than goog.Uri equivalents.
 * Repeated calls to some of functions may be quadratic in behavior for IE,
 * although the effect is somewhat limited given the 2kb limit.
 *
 * One advantage of the limited functionality here is that this approach is
 * less sensitive to differences in URI encodings than goog.Uri, since these
 * functions modify the strings in place, rather than decoding and
 * re-encoding.
 *
 * Uses features of RFC 3986 for parsing/formatting URIs:
 *   http://gbiv.com/protocols/uri/rfc/rfc3986.html
 *
 * @author gboyer@google.com (Garrett Boyer) - The "lightened" design.
 * @author msamuel@google.com (Mike Samuel) - Domain knowledge and regexes.
 */

goog.provide('goog.uri.utils');
goog.provide('goog.uri.utils.ComponentIndex');
goog.provide('goog.uri.utils.QueryArray');
goog.provide('goog.uri.utils.QueryValue');
goog.provide('goog.uri.utils.StandardQueryParam');

goog.require('goog.asserts');
goog.require('goog.string');
goog.require('goog.userAgent');


/**
 * Character codes inlined to avoid object allocations due to charCode.
 * @enum {number}
 * @private
 */
goog.uri.utils.CharCode_ = {
  AMPERSAND: 38,
  EQUAL: 61,
  HASH: 35,
  QUESTION: 63
};


/**
 * Builds a URI string from already-encoded parts.
 *
 * No encoding is performed.  Any component may be omitted as either null or
 * undefined.
 *
 * @param {?string=} opt_scheme The scheme such as 'http'.
 * @param {?string=} opt_userInfo The user name before the '@'.
 * @param {?string=} opt_domain The domain such as 'www.google.com', already
 *     URI-encoded.
 * @param {(string|number|null)=} opt_port The port number.
 * @param {?string=} opt_path The path, already URI-encoded.  If it is not
 *     empty, it must begin with a slash.
 * @param {?string=} opt_queryData The URI-encoded query data.
 * @param {?string=} opt_fragment The URI-encoded fragment identifier.
 * @return {string} The fully combined URI.
 */
goog.uri.utils.buildFromEncodedParts = function(opt_scheme, opt_userInfo,
    opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
  var out = [];

  if (opt_scheme) {
    out.push(opt_scheme, ':');
  }

  if (opt_domain) {
    out.push('//');

    if (opt_userInfo) {
      out.push(opt_userInfo, '@');
    }

    out.push(opt_domain);

    if (opt_port) {
      out.push(':', opt_port);
    }
  }

  if (opt_path) {
    out.push(opt_path);
  }

  if (opt_queryData) {
    out.push('?', opt_queryData);
  }

  if (opt_fragment) {
    out.push('#', opt_fragment);
  }

  return out.join('');
};


/**
 * A regular expression for breaking a URI into its component parts.
 *
 * {@link http://www.gbiv.com/protocols/uri/rfc/rfc3986.html#RFC2234} says
 * As the "first-match-wins" algorithm is identical to the "greedy"
 * disambiguation method used by POSIX regular expressions, it is natural and
 * commonplace to use a regular expression for parsing the potential five
 * components of a URI reference.
 *
 * The following line is the regular expression for breaking-down a
 * well-formed URI reference into its components.
 *
 * <pre>
 * ^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?
 *  12            3  4          5       6  7        8 9
 * </pre>
 *
 * The numbers in the second line above are only to assist readability; they
 * indicate the reference points for each subexpression (i.e., each paired
 * parenthesis). We refer to the value matched for subexpression <n> as $<n>.
 * For example, matching the above expression to
 * <pre>
 *     http://www.ics.uci.edu/pub/ietf/uri/#Related
 * </pre>
 * results in the following subexpression matches:
 * <pre>
 *    $1 = http:
 *    $2 = http
 *    $3 = //www.ics.uci.edu
 *    $4 = www.ics.uci.edu
 *    $5 = /pub/ietf/uri/
 *    $6 = <undefined>
 *    $7 = <undefined>
 *    $8 = #Related
 *    $9 = Related
 * </pre>
 * where <undefined> indicates that the component is not present, as is the
 * case for the query component in the above example. Therefore, we can
 * determine the value of the five components as
 * <pre>
 *    scheme    = $2
 *    authority = $4
 *    path      = $5
 *    query     = $7
 *    fragment  = $9
 * </pre>
 *
 * The regular expression has been modified slightly to expose the
 * userInfo, domain, and port separately from the authority.
 * The modified version yields
 * <pre>
 *    $1 = http              scheme
 *    $2 = <undefined>       userInfo -\
 *    $3 = www.ics.uci.edu   domain     | authority
 *    $4 = <undefined>       port     -/
 *    $5 = /pub/ietf/uri/    path
 *    $6 = <undefined>       query without ?
 *    $7 = Related           fragment without #
 * </pre>
 * @type {!RegExp}
 * @private
 */
goog.uri.utils.splitRe_ = new RegExp(
    '^' +
    '(?:' +
      '([^:/?#.]+)' +                     // scheme - ignore special characters
                                          // used by other URL parts such as :,
                                          // ?, /, #, and .
    ':)?' +
    '(?://' +
      '(?:([^/?#]*)@)?' +                 // userInfo
      '([\\w\\d\\-\\u0100-\\uffff.%]*)' + // domain - restrict to letters,
                                          // digits, dashes, dots, percent
                                          // escapes, and unicode characters.
      '(?::([0-9]+))?' +                  // port
    ')?' +
    '([^?#]+)?' +                         // path
    '(?:\\?([^#]*))?' +                   // query
    '(?:#(.*))?' +                        // fragment
    '$');


/**
 * The index of each URI component in the return value of goog.uri.utils.split.
 * @enum {number}
 */
goog.uri.utils.ComponentIndex = {
  SCHEME: 1,
  USER_INFO: 2,
  DOMAIN: 3,
  PORT: 4,
  PATH: 5,
  QUERY_DATA: 6,
  FRAGMENT: 7
};


/**
 * Splits a URI into its component parts.
 *
 * Each component can be accessed via the component indices; for example:
 * <pre>
 * goog.uri.utils.split(someStr)[goog.uri.utils.CompontentIndex.QUERY_DATA];
 * </pre>
 *
 * @param {string} uri The URI string to examine.
 * @return {!Array.<string|undefined>} Each component still URI-encoded.
 *     Each component that is present will contain the encoded value, whereas
 *     components that are not present will be undefined or empty, depending
 *     on the browser's regular expression implementation.  Never null, since
 *     arbitrary strings may still look like path names.
 */
goog.uri.utils.split = function(uri) {

  // See @return comment -- never null.
  return /** @type {!Array.<string|undefined>} */ (
      uri.match(goog.uri.utils.splitRe_));
};




/**
 * @param {?string} uri A possibly null string.
 * @return {?string} The string URI-decoded, or null if uri is null.
 * @private
 */
goog.uri.utils.decodeIfPossible_ = function(uri) {
  return uri && decodeURIComponent(uri);
};


/**
 * Gets a URI component by index.
 *
 * It is preferred to use the getPathEncoded() variety of functions ahead,
 * since they are more readable.
 *
 * @param {goog.uri.utils.ComponentIndex} componentIndex The component index.
 * @param {string} uri The URI to examine.
 * @return {?string} The still-encoded component, or null if the component
 *     is not present.
 * @private
 */
goog.uri.utils.getComponentByIndex_ = function(componentIndex, uri) {
  // Convert undefined, null, and empty string into null.
  return goog.uri.utils.split(uri)[componentIndex] || null;
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The protocol or scheme, or null if none.  Does not
 *     include trailing colons or slashes.
 */
goog.uri.utils.getScheme = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.SCHEME, uri);
};


/**
 * Gets the effective scheme for the URL.  If the URL is relative then the
 * scheme is derived from the page's location.
 * @param {string} uri The URI to examine.
 * @return {string} The protocol or scheme, always lower case.
 */
goog.uri.utils.getEffectiveScheme = function(uri) {
  var scheme = goog.uri.utils.getScheme(uri);
  if (!scheme && self.location) {
    var protocol = self.location.protocol;
    scheme = protocol.substr(0, protocol.length - 1);
  }
  // NOTE: When called from a web worker in Firefox 3.5, location maybe null.
  // All other browsers with web workers support self.location from the worker.
  return scheme ? scheme.toLowerCase() : '';
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The user name still encoded, or null if none.
 */
goog.uri.utils.getUserInfoEncoded = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.USER_INFO, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded user info, or null if none.
 */
goog.uri.utils.getUserInfo = function(uri) {
  return goog.uri.utils.decodeIfPossible_(
      goog.uri.utils.getUserInfoEncoded(uri));
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The domain name still encoded, or null if none.
 */
goog.uri.utils.getDomainEncoded = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.DOMAIN, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded domain, or null if none.
 */
goog.uri.utils.getDomain = function(uri) {
  return goog.uri.utils.decodeIfPossible_(goog.uri.utils.getDomainEncoded(uri));
};


/**
 * @param {string} uri The URI to examine.
 * @return {?number} The port number, or null if none.
 */
goog.uri.utils.getPort = function(uri) {
  // Coerce to a number.  If the result of getComponentByIndex_ is null or
  // non-numeric, the number coersion yields NaN.  This will then return
  // null for all non-numeric cases (though also zero, which isn't a relevant
  // port number).
  return Number(goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.PORT, uri)) || null;
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The path still encoded, or null if none. Includes the
 *     leading slash, if any.
 */
goog.uri.utils.getPathEncoded = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.PATH, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded path, or null if none.  Includes the leading
 *     slash, if any.
 */
goog.uri.utils.getPath = function(uri) {
  return goog.uri.utils.decodeIfPossible_(goog.uri.utils.getPathEncoded(uri));
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The query data still encoded, or null if none.  Does not
 *     include the question mark itself.
 */
goog.uri.utils.getQueryData = function(uri) {
  return goog.uri.utils.getComponentByIndex_(
      goog.uri.utils.ComponentIndex.QUERY_DATA, uri);
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The fragment identifier, or null if none.  Does not
 *     include the hash mark itself.
 */
goog.uri.utils.getFragmentEncoded = function(uri) {
  // The hash mark may not appear in any other part of the URL.
  var hashIndex = uri.indexOf('#');
  return hashIndex < 0 ? null : uri.substr(hashIndex + 1);
};


/**
 * @param {string} uri The URI to examine.
 * @param {?string} fragment The encoded fragment identifier, or null if none.
 *     Does not include the hash mark itself.
 * @return {string} The URI with the fragment set.
 */
goog.uri.utils.setFragmentEncoded = function(uri, fragment) {
  return goog.uri.utils.removeFragment(uri) + (fragment ? '#' + fragment : '');
};


/**
 * @param {string} uri The URI to examine.
 * @return {?string} The decoded fragment identifier, or null if none.  Does
 *     not include the hash mark.
 */
goog.uri.utils.getFragment = function(uri) {
  return goog.uri.utils.decodeIfPossible_(
      goog.uri.utils.getFragmentEncoded(uri));
};


/**
 * Extracts everything up to the port of the URI.
 * @param {string} uri The URI string.
 * @return {string} Everything up to and including the port.
 */
goog.uri.utils.getHost = function(uri) {
  var pieces = goog.uri.utils.split(uri);
  return goog.uri.utils.buildFromEncodedParts(
      pieces[goog.uri.utils.ComponentIndex.SCHEME],
      pieces[goog.uri.utils.ComponentIndex.USER_INFO],
      pieces[goog.uri.utils.ComponentIndex.DOMAIN],
      pieces[goog.uri.utils.ComponentIndex.PORT]);
};


/**
 * Extracts the path of the URL and everything after.
 * @param {string} uri The URI string.
 * @return {string} The URI, starting at the path and including the query
 *     parameters and fragment identifier.
 */
goog.uri.utils.getPathAndAfter = function(uri) {
  var pieces = goog.uri.utils.split(uri);
  return goog.uri.utils.buildFromEncodedParts(null, null, null, null,
      pieces[goog.uri.utils.ComponentIndex.PATH],
      pieces[goog.uri.utils.ComponentIndex.QUERY_DATA],
      pieces[goog.uri.utils.ComponentIndex.FRAGMENT]);
};


/**
 * Gets the URI with the fragment identifier removed.
 * @param {string} uri The URI to examine.
 * @return {string} Everything preceding the hash mark.
 */
goog.uri.utils.removeFragment = function(uri) {
  // The hash mark may not appear in any other part of the URL.
  var hashIndex = uri.indexOf('#');
  return hashIndex < 0 ? uri : uri.substr(0, hashIndex);
};


/**
 * Ensures that two URI's have the exact same domain, scheme, and port.
 *
 * Unlike the version in goog.Uri, this checks protocol, and therefore is
 * suitable for checking against the browser's same-origin policy.
 *
 * @param {string} uri1 The first URI.
 * @param {string} uri2 The second URI.
 * @return {boolean} Whether they have the same domain and port.
 */
goog.uri.utils.haveSameDomain = function(uri1, uri2) {
  var pieces1 = goog.uri.utils.split(uri1);
  var pieces2 = goog.uri.utils.split(uri2);
  return pieces1[goog.uri.utils.ComponentIndex.DOMAIN] ==
             pieces2[goog.uri.utils.ComponentIndex.DOMAIN] &&
         pieces1[goog.uri.utils.ComponentIndex.SCHEME] ==
             pieces2[goog.uri.utils.ComponentIndex.SCHEME] &&
         pieces1[goog.uri.utils.ComponentIndex.PORT] ==
             pieces2[goog.uri.utils.ComponentIndex.PORT];
};


/**
 * Asserts that there are no fragment or query identifiers, only in uncompiled
 * mode.
 * @param {string} uri The URI to examine.
 * @private
 */
goog.uri.utils.assertNoFragmentsOrQueries_ = function(uri) {
  // NOTE: would use goog.asserts here, but jscompiler doesn't know that
  // indexOf has no side effects.
  if (goog.DEBUG && (uri.indexOf('#') >= 0 || uri.indexOf('?') >= 0)) {
    throw Error('goog.uri.utils: Fragment or query identifiers are not ' +
        'supported: [' + uri + ']');
  }
};


/**
 * Supported query parameter values by the parameter serializing utilities.
 *
 * If a value is null or undefined, the key-value pair is skipped, as an easy
 * way to omit parameters conditionally.  Non-array parameters are converted
 * to a string and URI encoded.  Array values are expanded into multiple
 * &key=value pairs, with each element stringized and URI-encoded.
 *
 * @typedef {*}
 */
goog.uri.utils.QueryValue;


/**
 * An array representing a set of query parameters with alternating keys
 * and values.
 *
 * Keys are assumed to be URI encoded already and live at even indices.  See
 * goog.uri.utils.QueryValue for details on how parameter values are encoded.
 *
 * Example:
 * <pre>
 * var data = [
 *   // Simple param: ?name=BobBarker
 *   'name', 'BobBarker',
 *   // Conditional param -- may be omitted entirely.
 *   'specialDietaryNeeds', hasDietaryNeeds() ? getDietaryNeeds() : null,
 *   // Multi-valued param: &house=LosAngeles&house=NewYork&house=null
 *   'house', ['LosAngeles', 'NewYork', null]
 * ];
 * </pre>
 *
 * @typedef {!Array.<string|goog.uri.utils.QueryValue>}
 */
goog.uri.utils.QueryArray;


/**
 * Appends a URI and query data in a string buffer with special preconditions.
 *
 * Internal implementation utility, performing very few object allocations.
 *
 * @param {!Array.<string|undefined>} buffer A string buffer.  The first element
 *     must be the base URI, and may have a fragment identifier.  If the array
 *     contains more than one element, the second element must be an ampersand,
 *     and may be overwritten, depending on the base URI.  Undefined elements
 *     are treated as empty-string.
 * @return {string} The concatenated URI and query data.
 * @private
 */
goog.uri.utils.appendQueryData_ = function(buffer) {
  if (buffer[1]) {
    // At least one query parameter was added.  We need to check the
    // punctuation mark, which is currently an ampersand, and also make sure
    // there aren't any interfering fragment identifiers.
    var baseUri = /** @type {string} */ (buffer[0]);
    var hashIndex = baseUri.indexOf('#');
    if (hashIndex >= 0) {
      // Move the fragment off the base part of the URI into the end.
      buffer.push(baseUri.substr(hashIndex));
      buffer[0] = baseUri = baseUri.substr(0, hashIndex);
    }
    var questionIndex = baseUri.indexOf('?');
    if (questionIndex < 0) {
      // No question mark, so we need a question mark instead of an ampersand.
      buffer[1] = '?';
    } else if (questionIndex == baseUri.length - 1) {
      // Question mark is the very last character of the existing URI, so don't
      // append an additional delimiter.
      buffer[1] = undefined;
    }
  }

  return buffer.join('');
};


/**
 * Appends key=value pairs to an array, supporting multi-valued objects.
 * @param {string} key The key prefix.
 * @param {goog.uri.utils.QueryValue} value The value to serialize.
 * @param {!Array.<string>} pairs The array to which the 'key=value' strings
 *     should be appended.
 * @private
 */
goog.uri.utils.appendKeyValuePairs_ = function(key, value, pairs) {
  if (goog.isArray(value)) {
    // It's an array, so append all elements.  Here, we must convince
    // jscompiler that it is, indeed, an array.
    value = /** @type {Array} */ (value);
    for (var j = 0; j < value.length; j++) {
      pairs.push('&', key);
      // Check for empty string, null and undefined get encoded
      // into the url as literal strings
      if (value[j] !== '') {
        pairs.push('=', goog.string.urlEncode(value[j]));
      }
    }
  } else if (value != null) {
    // Not null or undefined, so safe to append.
    pairs.push('&', key);
    // Check for empty string, null and undefined get encoded
    // into the url as literal strings
    if (value !== '') {
      pairs.push('=', goog.string.urlEncode(value));
    }
  }
};


/**
 * Builds a buffer of query data from a sequence of alternating keys and values.
 *
 * @param {!Array.<string|undefined>} buffer A string buffer to append to.  The
 *     first element appended will be an '&', and may be replaced by the caller.
 * @param {goog.uri.utils.QueryArray|Arguments} keysAndValues An array with
 *     alternating keys and values -- see the typedef.
 * @param {number=} opt_startIndex A start offset into the arary, defaults to 0.
 * @return {!Array.<string|undefined>} The buffer argument.
 * @private
 */
goog.uri.utils.buildQueryDataBuffer_ = function(
    buffer, keysAndValues, opt_startIndex) {
  goog.asserts.assert(Math.max(keysAndValues.length - (opt_startIndex || 0),
      0) % 2 == 0, 'goog.uri.utils: Key/value lists must be even in length.');

  for (var i = opt_startIndex || 0; i < keysAndValues.length; i += 2) {
    goog.uri.utils.appendKeyValuePairs_(
        keysAndValues[i], keysAndValues[i + 1], buffer);
  }

  return buffer;
};


/**
 * Builds a query data string from a sequence of alternating keys and values.
 * Currently generates "&key&" for empty args.
 *
 * @param {goog.uri.utils.QueryArray} keysAndValues Alternating keys and
 *     values.  See the typedef.
 * @param {number=} opt_startIndex A start offset into the arary, defaults to 0.
 * @return {string} The encoded query string, in the for 'a=1&b=2'.
 */
goog.uri.utils.buildQueryData = function(keysAndValues, opt_startIndex) {
  var buffer = goog.uri.utils.buildQueryDataBuffer_(
      [], keysAndValues, opt_startIndex);
  buffer[0] = ''; // Remove the leading ampersand.
  return buffer.join('');
};


/**
 * Builds a buffer of query data from a map.
 *
 * @param {!Array.<string|undefined>} buffer A string buffer to append to.  The
 *     first element appended will be an '&', and may be replaced by the caller.
 * @param {Object.<goog.uri.utils.QueryValue>} map An object where keys are
 *     URI-encoded parameter keys, and the values conform to the contract
 *     specified in the goog.uri.utils.QueryValue typedef.
 * @return {!Array.<string|undefined>} The buffer argument.
 * @private
 */
goog.uri.utils.buildQueryDataBufferFromMap_ = function(buffer, map) {
  for (var key in map) {
    goog.uri.utils.appendKeyValuePairs_(key, map[key], buffer);
  }

  return buffer;
};


/**
 * Builds a query data string from a map.
 * Currently generates "&key&" for empty args.
 *
 * @param {Object} map An object where keys are URI-encoded parameter keys,
 *     and the values are arbitrary types or arrays.  Keys with a null value
 *     are dropped.
 * @return {string} The encoded query string, in the for 'a=1&b=2'.
 */
goog.uri.utils.buildQueryDataFromMap = function(map) {
  var buffer = goog.uri.utils.buildQueryDataBufferFromMap_([], map);
  buffer[0] = '';
  return buffer.join('');
};


/**
 * Appends URI parameters to an existing URI.
 *
 * The variable arguments may contain alternating keys and values.  Keys are
 * assumed to be already URI encoded.  The values should not be URI-encoded,
 * and will instead be encoded by this function.
 * <pre>
 * appendParams('http://www.foo.com?existing=true',
 *     'key1', 'value1',
 *     'key2', 'value?willBeEncoded',
 *     'key3', ['valueA', 'valueB', 'valueC'],
 *     'key4', null);
 * result: 'http://www.foo.com?existing=true&' +
 *     'key1=value1&' +
 *     'key2=value%3FwillBeEncoded&' +
 *     'key3=valueA&key3=valueB&key3=valueC'
 * </pre>
 *
 * A single call to this function will not exhibit quadratic behavior in IE,
 * whereas multiple repeated calls may, although the effect is limited by
 * fact that URL's generally can't exceed 2kb.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {...(goog.uri.utils.QueryArray|string|goog.uri.utils.QueryValue)} var_args
 *     An array or argument list conforming to goog.uri.utils.QueryArray.
 * @return {string} The URI with all query parameters added.
 */
goog.uri.utils.appendParams = function(uri, var_args) {
  return goog.uri.utils.appendQueryData_(
      arguments.length == 2 ?
      goog.uri.utils.buildQueryDataBuffer_([uri], arguments[1], 0) :
      goog.uri.utils.buildQueryDataBuffer_([uri], arguments, 1));
};


/**
 * Appends query parameters from a map.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {Object} map An object where keys are URI-encoded parameter keys,
 *     and the values are arbitrary types or arrays.  Keys with a null value
 *     are dropped.
 * @return {string} The new parameters.
 */
goog.uri.utils.appendParamsFromMap = function(uri, map) {
  return goog.uri.utils.appendQueryData_(
      goog.uri.utils.buildQueryDataBufferFromMap_([uri], map));
};


/**
 * Appends a single URI parameter.
 *
 * Repeated calls to this can exhibit quadratic behavior in IE6 due to the
 * way string append works, though it should be limited given the 2kb limit.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {string} key The key, which must already be URI encoded.
 * @param {*} value The value, which will be stringized and encoded (assumed
 *     not already to be encoded).
 * @return {string} The URI with the query parameter added.
 */
goog.uri.utils.appendParam = function(uri, key, value) {
  return goog.uri.utils.appendQueryData_(
      [uri, '&', key, '=', goog.string.urlEncode(value)]);
};


/**
 * Finds the next instance of a query parameter with the specified name.
 *
 * Does not instantiate any objects.
 *
 * @param {string} uri The URI to search.  May contain a fragment identifier
 *     if opt_hashIndex is specified.
 * @param {number} startIndex The index to begin searching for the key at.  A
 *     match may be found even if this is one character after the ampersand.
 * @param {string} keyEncoded The URI-encoded key.
 * @param {number} hashOrEndIndex Index to stop looking at.  If a hash
 *     mark is present, it should be its index, otherwise it should be the
 *     length of the string.
 * @return {number} The position of the first character in the key's name,
 *     immediately after either a question mark or a dot.
 * @private
 */
goog.uri.utils.findParam_ = function(
    uri, startIndex, keyEncoded, hashOrEndIndex) {
  var index = startIndex;
  var keyLength = keyEncoded.length;

  // Search for the key itself and post-filter for surronuding punctuation,
  // rather than expensively building a regexp.
  while ((index = uri.indexOf(keyEncoded, index)) >= 0 &&
      index < hashOrEndIndex) {
    var precedingChar = uri.charCodeAt(index - 1);
    // Ensure that the preceding character is '&' or '?'.
    if (precedingChar == goog.uri.utils.CharCode_.AMPERSAND ||
        precedingChar == goog.uri.utils.CharCode_.QUESTION) {
      // Ensure the following character is '&', '=', '#', or NaN
      // (end of string).
      var followingChar = uri.charCodeAt(index + keyLength);
      if (!followingChar ||
          followingChar == goog.uri.utils.CharCode_.EQUAL ||
          followingChar == goog.uri.utils.CharCode_.AMPERSAND ||
          followingChar == goog.uri.utils.CharCode_.HASH) {
        return index;
      }
    }
    index += keyLength + 1;
  }

  return -1;
};


/**
 * Regular expression for finding a hash mark or end of string.
 * @type {RegExp}
 * @private
 */
goog.uri.utils.hashOrEndRe_ = /#|$/;


/**
 * Determines if the URI contains a specific key.
 *
 * Performs no object instantiations.
 *
 * @param {string} uri The URI to process.  May contain a fragment
 *     identifier.
 * @param {string} keyEncoded The URI-encoded key.  Case-sensitive.
 * @return {boolean} Whether the key is present.
 */
goog.uri.utils.hasParam = function(uri, keyEncoded) {
  return goog.uri.utils.findParam_(uri, 0, keyEncoded,
      uri.search(goog.uri.utils.hashOrEndRe_)) >= 0;
};


/**
 * Gets the first value of a query parameter.
 * @param {string} uri The URI to process.  May contain a fragment.
 * @param {string} keyEncoded The URI-encoded key.  Case-sensitive.
 * @return {?string} The first value of the parameter (URI-decoded), or null
 *     if the parameter is not found.
 */
goog.uri.utils.getParamValue = function(uri, keyEncoded) {
  var hashOrEndIndex = uri.search(goog.uri.utils.hashOrEndRe_);
  var foundIndex = goog.uri.utils.findParam_(
      uri, 0, keyEncoded, hashOrEndIndex);

  if (foundIndex < 0) {
    return null;
  } else {
    var endPosition = uri.indexOf('&', foundIndex);
    if (endPosition < 0 || endPosition > hashOrEndIndex) {
      endPosition = hashOrEndIndex;
    }
    // Progress forth to the end of the "key=" or "key&" substring.
    foundIndex += keyEncoded.length + 1;
    // Use substr, because it (unlike substring) will return empty string
    // if foundIndex > endPosition.
    return goog.string.urlDecode(
        uri.substr(foundIndex, endPosition - foundIndex));
  }
};


/**
 * Gets all values of a query parameter.
 * @param {string} uri The URI to process.  May contain a framgnet.
 * @param {string} keyEncoded The URI-encoded key.  Case-snsitive.
 * @return {!Array.<string>} All URI-decoded values with the given key.
 *     If the key is not found, this will have length 0, but never be null.
 */
goog.uri.utils.getParamValues = function(uri, keyEncoded) {
  var hashOrEndIndex = uri.search(goog.uri.utils.hashOrEndRe_);
  var position = 0;
  var foundIndex;
  var result = [];

  while ((foundIndex = goog.uri.utils.findParam_(
      uri, position, keyEncoded, hashOrEndIndex)) >= 0) {
    // Find where this parameter ends, either the '&' or the end of the
    // query parameters.
    position = uri.indexOf('&', foundIndex);
    if (position < 0 || position > hashOrEndIndex) {
      position = hashOrEndIndex;
    }

    // Progress forth to the end of the "key=" or "key&" substring.
    foundIndex += keyEncoded.length + 1;
    // Use substr, because it (unlike substring) will return empty string
    // if foundIndex > position.
    result.push(goog.string.urlDecode(uri.substr(
        foundIndex, position - foundIndex)));
  }

  return result;
};


/**
 * Regexp to find trailing question marks and ampersands.
 * @type {RegExp}
 * @private
 */
goog.uri.utils.trailingQueryPunctuationRe_ = /[?&]($|#)/;


/**
 * Removes all instances of a query parameter.
 * @param {string} uri The URI to process.  Must not contain a fragment.
 * @param {string} keyEncoded The URI-encoded key.
 * @return {string} The URI with all instances of the parameter removed.
 */
goog.uri.utils.removeParam = function(uri, keyEncoded) {
  var hashOrEndIndex = uri.search(goog.uri.utils.hashOrEndRe_);
  var position = 0;
  var foundIndex;
  var buffer = [];

  // Look for a query parameter.
  while ((foundIndex = goog.uri.utils.findParam_(
      uri, position, keyEncoded, hashOrEndIndex)) >= 0) {
    // Get the portion of the query string up to, but not including, the ?
    // or & starting the parameter.
    buffer.push(uri.substring(position, foundIndex));
    // Progress to immediately after the '&'.  If not found, go to the end.
    // Avoid including the hash mark.
    position = Math.min((uri.indexOf('&', foundIndex) + 1) || hashOrEndIndex,
        hashOrEndIndex);
  }

  // Append everything that is remaining.
  buffer.push(uri.substr(position));

  // Join the buffer, and remove trailing punctuation that remains.
  return buffer.join('').replace(
      goog.uri.utils.trailingQueryPunctuationRe_, '$1');
};


/**
 * Replaces all existing definitions of a parameter with a single definition.
 *
 * Repeated calls to this can exhibit quadratic behavior due to the need to
 * find existing instances and reconstruct the string, though it should be
 * limited given the 2kb limit.  Consider using appendParams to append multiple
 * parameters in bulk.
 *
 * @param {string} uri The original URI, which may already have query data.
 * @param {string} keyEncoded The key, which must already be URI encoded.
 * @param {*} value The value, which will be stringized and encoded (assumed
 *     not already to be encoded).
 * @return {string} The URI with the query parameter added.
 */
goog.uri.utils.setParam = function(uri, keyEncoded, value) {
  return goog.uri.utils.appendParam(
      goog.uri.utils.removeParam(uri, keyEncoded), keyEncoded, value);
};


/**
 * Generates a URI path using a given URI and a path with checks to
 * prevent consecutive "//". The baseUri passed in must not contain
 * query or fragment identifiers. The path to append may not contain query or
 * fragment identifiers.
 *
 * @param {string} baseUri URI to use as the base.
 * @param {string} path Path to append.
 * @return {string} Updated URI.
 */
goog.uri.utils.appendPath = function(baseUri, path) {
  goog.uri.utils.assertNoFragmentsOrQueries_(baseUri);

  // Remove any trailing '/'
  if (goog.string.endsWith(baseUri, '/')) {
    baseUri = baseUri.substr(0, baseUri.length - 1);
  }
  // Remove any leading '/'
  if (goog.string.startsWith(path, '/')) {
    path = path.substr(1);
  }
  return goog.string.buildString(baseUri, '/', path);
};


/**
 * Standard supported query parameters.
 * @enum {string}
 */
goog.uri.utils.StandardQueryParam = {

  /** Unused parameter for unique-ifying. */
  RANDOM: 'zx'
};


/**
 * Sets the zx parameter of a URI to a random value.
 * @param {string} uri Any URI.
 * @return {string} That URI with the "zx" parameter added or replaced to
 *     contain a random string.
 */
goog.uri.utils.makeUnique = function(uri) {
  return goog.uri.utils.setParam(uri,
      goog.uri.utils.StandardQueryParam.RANDOM, goog.string.getRandomString());
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Wrapper class for handling XmlHttpRequests.
 *
 * One off requests can be sent through goog.net.XhrIo.send() or an
 * instance can be created to send multiple requests.  Each request uses its
 * own XmlHttpRequest object and handles clearing of the event callback to
 * ensure no leaks.
 *
 * XhrIo is event based, it dispatches events when a request finishes, fails or
 * succeeds or when the ready-state changes. The ready-state or timeout event
 * fires first, followed by a generic completed event. Then the abort, error,
 * or success event is fired as appropriate. Lastly, the ready event will fire
 * to indicate that the object may be used to make another request.
 *
 * The error event may also be called before completed and
 * ready-state-change if the XmlHttpRequest.open() or .send() methods throw.
 *
 * This class does not support multiple requests, queuing, or prioritization.
 *
 * Tested = IE6, FF1.5, Safari, Opera 8.5
 *
 * TODO(user): Error cases aren't playing nicely in Safari.
 *
 */


goog.provide('goog.net.XhrIo');
goog.provide('goog.net.XhrIo.ResponseType');

goog.require('goog.Timer');
goog.require('goog.debug.Logger');
goog.require('goog.debug.entryPointRegistry');
goog.require('goog.debug.errorHandlerWeakDep');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('goog.net.ErrorCode');
goog.require('goog.net.EventType');
goog.require('goog.net.HttpStatus');
goog.require('goog.net.XmlHttp');
goog.require('goog.object');
goog.require('goog.structs');
goog.require('goog.structs.Map');
goog.require('goog.uri.utils');



/**
 * Basic class for handling XMLHttpRequests.
 * @param {goog.net.XmlHttpFactory=} opt_xmlHttpFactory Factory to use when
 *     creating XMLHttpRequest objects.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
goog.net.XhrIo = function(opt_xmlHttpFactory) {
  goog.events.EventTarget.call(this);

  /**
   * Map of default headers to add to every request, use:
   * XhrIo.headers.set(name, value)
   * @type {goog.structs.Map}
   */
  this.headers = new goog.structs.Map();

  /**
   * Optional XmlHttpFactory
   * @type {goog.net.XmlHttpFactory}
   * @private
   */
  this.xmlHttpFactory_ = opt_xmlHttpFactory || null;
};
goog.inherits(goog.net.XhrIo, goog.events.EventTarget);


/**
 * Response types that may be requested for XMLHttpRequests.
 * @enum {string}
 * @see http://www.w3.org/TR/XMLHttpRequest/#the-responsetype-attribute
 */
goog.net.XhrIo.ResponseType = {
  DEFAULT: '',
  TEXT: 'text',
  DOCUMENT: 'document',
  // Not supported as of Chrome 10.0.612.1 dev
  BLOB: 'blob',
  ARRAY_BUFFER: 'arraybuffer'
};


/**
 * A reference to the XhrIo logger
 * @type {goog.debug.Logger}
 * @private
 */
goog.net.XhrIo.prototype.logger_ =
    goog.debug.Logger.getLogger('goog.net.XhrIo');


/**
 * The Content-Type HTTP header name
 * @type {string}
 */
goog.net.XhrIo.CONTENT_TYPE_HEADER = 'Content-Type';


/**
 * The pattern matching the 'http' and 'https' URI schemes
 * @type {!RegExp}
 */
goog.net.XhrIo.HTTP_SCHEME_PATTERN = /^https?$/i;


/**
 * The Content-Type HTTP header value for a url-encoded form
 * @type {string}
 */
goog.net.XhrIo.FORM_CONTENT_TYPE =
    'application/x-www-form-urlencoded;charset=utf-8';


/**
 * All non-disposed instances of goog.net.XhrIo created
 * by {@link goog.net.XhrIo.send} are in this Array.
 * @see goog.net.XhrIo.cleanup
 * @type {Array.<goog.net.XhrIo>}
 * @private
 */
goog.net.XhrIo.sendInstances_ = [];


/**
 * Static send that creates a short lived instance of XhrIo to send the
 * request.
 * @see goog.net.XhrIo.cleanup
 * @param {string|goog.Uri} url Uri to make request to.
 * @param {Function=} opt_callback Callback function for when request is
 *     complete.
 * @param {string=} opt_method Send method, default: GET.
 * @param {string|GearsBlob=} opt_content Post data. This can be a Gears blob
 *     if the underlying HTTP request object is a Gears HTTP request.
 * @param {Object|goog.structs.Map=} opt_headers Map of headers to add to the
 *     request.
 * @param {number=} opt_timeoutInterval Number of milliseconds after which an
 *     incomplete request will be aborted; 0 means no timeout is set.
 */
goog.net.XhrIo.send = function(url, opt_callback, opt_method, opt_content,
                               opt_headers, opt_timeoutInterval) {
  var x = new goog.net.XhrIo();
  goog.net.XhrIo.sendInstances_.push(x);
  if (opt_callback) {
    goog.events.listen(x, goog.net.EventType.COMPLETE, opt_callback);
  }
  goog.events.listen(x,
                     goog.net.EventType.READY,
                     goog.partial(goog.net.XhrIo.cleanupSend_, x));
  if (opt_timeoutInterval) {
    x.setTimeoutInterval(opt_timeoutInterval);
  }
  x.send(url, opt_method, opt_content, opt_headers);
};


/**
 * Disposes all non-disposed instances of goog.net.XhrIo created by
 * {@link goog.net.XhrIo.send}.
 * {@link goog.net.XhrIo.send} cleans up the goog.net.XhrIo instance
 * it creates when the request completes or fails.  However, if
 * the request never completes, then the goog.net.XhrIo is not disposed.
 * This can occur if the window is unloaded before the request completes.
 * We could have {@link goog.net.XhrIo.send} return the goog.net.XhrIo
 * it creates and make the client of {@link goog.net.XhrIo.send} be
 * responsible for disposing it in this case.  However, this makes things
 * significantly more complicated for the client, and the whole point
 * of {@link goog.net.XhrIo.send} is that it's simple and easy to use.
 * Clients of {@link goog.net.XhrIo.send} should call
 * {@link goog.net.XhrIo.cleanup} when doing final
 * cleanup on window unload.
 */
goog.net.XhrIo.cleanup = function() {
  var instances = goog.net.XhrIo.sendInstances_;
  while (instances.length) {
    instances.pop().dispose();
  }
};


/**
 * Installs exception protection for all entry point introduced by
 * goog.net.XhrIo instances which are not protected by
 * {@link goog.debug.ErrorHandler#protectWindowSetTimeout},
 * {@link goog.debug.ErrorHandler#protectWindowSetInterval}, or
 * {@link goog.events.protectBrowserEventEntryPoint}.
 *
 * @param {goog.debug.ErrorHandler} errorHandler Error handler with which to
 *     protect the entry point(s).
 */
goog.net.XhrIo.protectEntryPoints = function(errorHandler) {
  goog.net.XhrIo.prototype.onReadyStateChangeEntryPoint_ =
      errorHandler.protectEntryPoint(
          goog.net.XhrIo.prototype.onReadyStateChangeEntryPoint_);
};


/**
 * Disposes of the specified goog.net.XhrIo created by
 * {@link goog.net.XhrIo.send} and removes it from
 * {@link goog.net.XhrIo.pendingStaticSendInstances_}.
 * @param {goog.net.XhrIo} XhrIo An XhrIo created by
 *     {@link goog.net.XhrIo.send}.
 * @private
 */
goog.net.XhrIo.cleanupSend_ = function(XhrIo) {
  XhrIo.dispose();
  goog.array.remove(goog.net.XhrIo.sendInstances_, XhrIo);
};


/**
 * Whether XMLHttpRequest is active.  A request is active from the time send()
 * is called until onReadyStateChange() is complete, or error() or abort()
 * is called.
 * @type {boolean}
 * @private
 */
goog.net.XhrIo.prototype.active_ = false;


/**
 * Reference to an XMLHttpRequest object that is being used for the transfer.
 * @type {XMLHttpRequest|GearsHttpRequest}
 * @private
 */
goog.net.XhrIo.prototype.xhr_ = null;


/**
 * The options to use with the current XMLHttpRequest object.
 * @type {Object}
 * @private
 */
goog.net.XhrIo.prototype.xhrOptions_ = null;


/**
 * Last URL that was requested.
 * @type {string|goog.Uri}
 * @private
 */
goog.net.XhrIo.prototype.lastUri_ = '';


/**
 * Method for the last request.
 * @type {string}
 * @private
 */
goog.net.XhrIo.prototype.lastMethod_ = '';


/**
 * Last error code.
 * @type {goog.net.ErrorCode}
 * @private
 */
goog.net.XhrIo.prototype.lastErrorCode_ = goog.net.ErrorCode.NO_ERROR;


/**
 * Last error message.
 * @type {Error|string}
 * @private
 */
goog.net.XhrIo.prototype.lastError_ = '';


/**
 * This is used to ensure that we don't dispatch an multiple ERROR events. This
 * can happen in IE when it does a synchronous load and one error is handled in
 * the ready statte change and one is handled due to send() throwing an
 * exception.
 * @type {boolean}
 * @private
 */
goog.net.XhrIo.prototype.errorDispatched_ = false;


/**
 * Used to make sure we don't fire the complete event from inside a send call.
 * @type {boolean}
 * @private
 */
goog.net.XhrIo.prototype.inSend_ = false;


/**
 * Used in determining if a call to {@link #onReadyStateChange_} is from within
 * a call to this.xhr_.open.
 * @type {boolean}
 * @private
 */
goog.net.XhrIo.prototype.inOpen_ = false;


/**
 * Used in determining if a call to {@link #onReadyStateChange_} is from within
 * a call to this.xhr_.abort.
 * @type {boolean}
 * @private
 */
goog.net.XhrIo.prototype.inAbort_ = false;


/**
 * Number of milliseconds after which an incomplete request will be aborted and
 * a {@link goog.net.EventType.TIMEOUT} event raised; 0 means no timeout is set.
 * @type {number}
 * @private
 */
goog.net.XhrIo.prototype.timeoutInterval_ = 0;


/**
 * Window timeout ID used to cancel the timeout event handler if the request
 * completes successfully.
 * @type {Object}
 * @private
 */
goog.net.XhrIo.prototype.timeoutId_ = null;


/**
 * The requested type for the response. The empty string means use the default
 * XHR behavior.
 * @type {goog.net.XhrIo.ResponseType}
 * @private
 */
goog.net.XhrIo.prototype.responseType_ = goog.net.XhrIo.ResponseType.DEFAULT;


/**
 * Whether a "credentialed" request is to be sent (one that is aware of cookies
 * and authentication) . This is applicable only for cross-domain requests and
 * more recent browsers that support this part of the HTTP Access Control
 * standard.
 *
 * @see http://www.w3.org/TR/XMLHttpRequest/#the-withcredentials-attribute
 *
 * @type {boolean}
 * @private
 */
goog.net.XhrIo.prototype.withCredentials_ = false;


/**
 * Returns the number of milliseconds after which an incomplete request will be
 * aborted, or 0 if no timeout is set.
 * @return {number} Timeout interval in milliseconds.
 */
goog.net.XhrIo.prototype.getTimeoutInterval = function() {
  return this.timeoutInterval_;
};


/**
 * Sets the number of milliseconds after which an incomplete request will be
 * aborted and a {@link goog.net.EventType.TIMEOUT} event raised; 0 means no
 * timeout is set.
 * @param {number} ms Timeout interval in milliseconds; 0 means none.
 */
goog.net.XhrIo.prototype.setTimeoutInterval = function(ms) {
  this.timeoutInterval_ = Math.max(0, ms);
};


/**
 * Sets the desired type for the response. At time of writing, this is only
 * supported in very recent versions of WebKit (10.0.612.1 dev and later).
 *
 * If this is used, the response may only be accessed via {@link #getResponse}.
 *
 * @param {goog.net.XhrIo.ResponseType} type The desired type for the response.
 */
goog.net.XhrIo.prototype.setResponseType = function(type) {
  this.responseType_ = type;
};


/**
 * Gets the desired type for the response.
 * @return {goog.net.XhrIo.ResponseType} The desired type for the response.
 */
goog.net.XhrIo.prototype.getResponseType = function() {
  return this.responseType_;
};


/**
 * Sets whether a "credentialed" request that is aware of cookie and
 * authentication information should be made. This option is only supported by
 * browsers that support HTTP Access Control. As of this writing, this option
 * is not supported in IE.
 *
 * @param {boolean} withCredentials Whether this should be a "credentialed"
 *     request.
 */
goog.net.XhrIo.prototype.setWithCredentials = function(withCredentials) {
  this.withCredentials_ = withCredentials;
};


/**
 * Gets whether a "credentialed" request is to be sent.
 * @return {boolean} The desired type for the response.
 */
goog.net.XhrIo.prototype.getWithCredentials = function() {
  return this.withCredentials_;
};


/**
 * Instance send that actually uses XMLHttpRequest to make a server call.
 * @param {string|goog.Uri} url Uri to make request to.
 * @param {string=} opt_method Send method, default: GET.
 * @param {string|GearsBlob=} opt_content Post data. This can be a Gears blob
 *     if the underlying HTTP request object is a Gears HTTP request.
 * @param {Object|goog.structs.Map=} opt_headers Map of headers to add to the
 *     request.
 */
goog.net.XhrIo.prototype.send = function(url, opt_method, opt_content,
                                         opt_headers) {
  if (this.xhr_) {
    throw Error('[goog.net.XhrIo] Object is active with another request');
  }

  var method = opt_method ? opt_method.toUpperCase() : 'GET';

  this.lastUri_ = url;
  this.lastError_ = '';
  this.lastErrorCode_ = goog.net.ErrorCode.NO_ERROR;
  this.lastMethod_ = method;
  this.errorDispatched_ = false;
  this.active_ = true;

  // Use the factory to create the XHR object and options
  this.xhr_ = this.createXhr();
  this.xhrOptions_ = this.xmlHttpFactory_ ?
      this.xmlHttpFactory_.getOptions() : goog.net.XmlHttp.getOptions();

  // Set up the onreadystatechange callback
  this.xhr_.onreadystatechange = goog.bind(this.onReadyStateChange_, this);

  /**
   * Try to open the XMLHttpRequest (always async), if an error occurs here it
   * is generally permission denied
   * @preserveTry
   */
  try {
    this.logger_.fine(this.formatMsg_('Opening Xhr'));
    this.inOpen_ = true;
    this.xhr_.open(method, url, true);  // Always async!
    this.inOpen_ = false;
  } catch (err) {
    this.logger_.fine(this.formatMsg_('Error opening Xhr: ' + err.message));
    this.error_(goog.net.ErrorCode.EXCEPTION, err);
    return;
  }

  // We can't use null since this won't allow POSTs to have a content length
  // specified which will cause some proxies to return a 411 error.
  var content = opt_content || '';

  var headers = this.headers.clone();

  // Add headers specific to this request
  if (opt_headers) {
    goog.structs.forEach(opt_headers, function(value, key) {
      headers.set(key, value);
    });
  }

  if (method == 'POST' &&
      !headers.containsKey(goog.net.XhrIo.CONTENT_TYPE_HEADER)) {
    // For POST requests, default to the url-encoded form content type.
    headers.set(goog.net.XhrIo.CONTENT_TYPE_HEADER,
                goog.net.XhrIo.FORM_CONTENT_TYPE);
  }

  // Add the headers to the Xhr object
  goog.structs.forEach(headers, function(value, key) {
    this.xhr_.setRequestHeader(key, value);
  }, this);

  if (this.responseType_) {
    this.xhr_.responseType = this.responseType_;
  }

  if (goog.object.containsKey(this.xhr_, 'withCredentials')) {
    this.xhr_.withCredentials = this.withCredentials_;
  }

  /**
   * Try to send the request, or other wise report an error (404 not found).
   * @preserveTry
   */
  try {
    if (this.timeoutId_) {
      // This should never happen, since the if (this.active_) above shouldn't
      // let execution reach this point if there is a request in progress...
      goog.Timer.defaultTimerObject.clearTimeout(this.timeoutId_);
      this.timeoutId_ = null;
    }
    if (this.timeoutInterval_ > 0) {
      this.logger_.fine(this.formatMsg_('Will abort after ' +
          this.timeoutInterval_ + 'ms if incomplete'));
      this.timeoutId_ = goog.Timer.defaultTimerObject.setTimeout(
          goog.bind(this.timeout_, this), this.timeoutInterval_);
    }
    this.logger_.fine(this.formatMsg_('Sending request'));
    this.inSend_ = true;
    this.xhr_.send(content);
    this.inSend_ = false;

  } catch (err) {
    this.logger_.fine(this.formatMsg_('Send error: ' + err.message));
    this.error_(goog.net.ErrorCode.EXCEPTION, err);
  }
};


/**
 * Creates a new XHR object.
 * @return {XMLHttpRequest|GearsHttpRequest} The newly created XHR object.
 * @protected
 */
goog.net.XhrIo.prototype.createXhr = function() {
  return this.xmlHttpFactory_ ?
      this.xmlHttpFactory_.createInstance() : goog.net.XmlHttp();
};


/**
 * The request didn't complete after {@link goog.net.XhrIo#timeoutInterval_}
 * milliseconds; raises a {@link goog.net.EventType.TIMEOUT} event and aborts
 * the request.
 * @private
 */
goog.net.XhrIo.prototype.timeout_ = function() {
  if (typeof goog == 'undefined') {
    // If goog is undefined then the callback has occurred as the application
    // is unloading and will error.  Thus we let it silently fail.
  } else if (this.xhr_) {
    this.lastError_ = 'Timed out after ' + this.timeoutInterval_ +
                      'ms, aborting';
    this.lastErrorCode_ = goog.net.ErrorCode.TIMEOUT;
    this.logger_.fine(this.formatMsg_(this.lastError_));
    this.dispatchEvent(goog.net.EventType.TIMEOUT);
    this.abort(goog.net.ErrorCode.TIMEOUT);
  }
};


/**
 * Something errorred, so inactivate, fire error callback and clean up
 * @param {goog.net.ErrorCode} errorCode The error code.
 * @param {Error} err The error object.
 * @private
 */
goog.net.XhrIo.prototype.error_ = function(errorCode, err) {
  this.active_ = false;
  if (this.xhr_) {
    this.inAbort_ = true;
    this.xhr_.abort();  // Ensures XHR isn't hung (FF)
    this.inAbort_ = false;
  }
  this.lastError_ = err;
  this.lastErrorCode_ = errorCode;
  this.dispatchErrors_();
  this.cleanUpXhr_();
};


/**
 * Dispatches COMPLETE and ERROR in case of an error. This ensures that we do
 * not dispatch multiple error events.
 * @private
 */
goog.net.XhrIo.prototype.dispatchErrors_ = function() {
  if (!this.errorDispatched_) {
    this.errorDispatched_ = true;
    this.dispatchEvent(goog.net.EventType.COMPLETE);
    this.dispatchEvent(goog.net.EventType.ERROR);
  }
};


/**
 * Abort the current XMLHttpRequest
 * @param {goog.net.ErrorCode=} opt_failureCode Optional error code to use -
 *     defaults to ABORT.
 */
goog.net.XhrIo.prototype.abort = function(opt_failureCode) {
  if (this.xhr_ && this.active_) {
    this.logger_.fine(this.formatMsg_('Aborting'));
    this.active_ = false;
    this.inAbort_ = true;
    this.xhr_.abort();
    this.inAbort_ = false;
    this.lastErrorCode_ = opt_failureCode || goog.net.ErrorCode.ABORT;
    this.dispatchEvent(goog.net.EventType.COMPLETE);
    this.dispatchEvent(goog.net.EventType.ABORT);
    this.cleanUpXhr_();
  }
};


/**
 * Nullifies all callbacks to reduce risks of leaks.
 * @override
 * @protected
 */
goog.net.XhrIo.prototype.disposeInternal = function() {
  if (this.xhr_) {
    // We explicitly do not call xhr_.abort() unless active_ is still true.
    // This is to avoid unnecessarily aborting a successful request when
    // dispose() is called in a callback triggered by a complete response, but
    // in which browser cleanup has not yet finished.
    // (See http://b/issue?id=1684217.)
    if (this.active_) {
      this.active_ = false;
      this.inAbort_ = true;
      this.xhr_.abort();
      this.inAbort_ = false;
    }
    this.cleanUpXhr_(true);
  }

  goog.net.XhrIo.superClass_.disposeInternal.call(this);
};


/**
 * Internal handler for the XHR object's readystatechange event.  This method
 * checks the status and the readystate and fires the correct callbacks.
 * If the request has ended, the handlers are cleaned up and the XHR object is
 * nullified.
 * @private
 */
goog.net.XhrIo.prototype.onReadyStateChange_ = function() {
  if (!this.inOpen_ && !this.inSend_ && !this.inAbort_) {
    // Were not being called from within a call to this.xhr_.send
    // this.xhr_.abort, or this.xhr_.open, so this is an entry point
    this.onReadyStateChangeEntryPoint_();
  } else {
    this.onReadyStateChangeHelper_();
  }
};


/**
 * Used to protect the onreadystatechange handler entry point.  Necessary
 * as {#onReadyStateChange_} maybe called from within send or abort, this
 * method is only called when {#onReadyStateChange_} is called as an
 * entry point.
 * {@see #protectEntryPoints}
 * @private
 */
goog.net.XhrIo.prototype.onReadyStateChangeEntryPoint_ = function() {
  this.onReadyStateChangeHelper_();
};


/**
 * Helper for {@link #onReadyStateChange_}.  This is used so that
 * entry point calls to {@link #onReadyStateChange_} can be routed through
 * {@link #onReadyStateChangeEntryPoint_}.
 * @private
 */
goog.net.XhrIo.prototype.onReadyStateChangeHelper_ = function() {
  if (!this.active_) {
    // can get called inside abort call
    return;
  }

  if (typeof goog == 'undefined') {
    // NOTE(user): If goog is undefined then the callback has occurred as the
    // application is unloading and will error.  Thus we let it silently fail.

  } else if (
      this.xhrOptions_[goog.net.XmlHttp.OptionType.LOCAL_REQUEST_ERROR] &&
      this.getReadyState() == goog.net.XmlHttp.ReadyState.COMPLETE &&
      this.getStatus() == 2) {
    // NOTE(user): In IE if send() errors on a *local* request the readystate
    // is still changed to COMPLETE.  We need to ignore it and allow the
    // try/catch around send() to pick up the error.
    this.logger_.fine(this.formatMsg_(
        'Local request error detected and ignored'));

  } else {

    // In IE when the response has been cached we sometimes get the callback
    // from inside the send call and this usually breaks code that assumes that
    // XhrIo is asynchronous.  If that is the case we delay the callback
    // using a timer.
    if (this.inSend_ &&
        this.getReadyState() == goog.net.XmlHttp.ReadyState.COMPLETE) {
      goog.Timer.defaultTimerObject.setTimeout(
          goog.bind(this.onReadyStateChange_, this), 0);
      return;
    }

    this.dispatchEvent(goog.net.EventType.READY_STATE_CHANGE);

    // readyState indicates the transfer has finished
    if (this.isComplete()) {
      this.logger_.fine(this.formatMsg_('Request complete'));

      this.active_ = false;

      // Call the specific callbacks for success or failure. Only call the
      // success if the status is 200 (HTTP_OK) or 304 (HTTP_CACHED)
      if (this.isSuccess()) {
        this.dispatchEvent(goog.net.EventType.COMPLETE);
        this.dispatchEvent(goog.net.EventType.SUCCESS);
      } else {
        this.lastErrorCode_ = goog.net.ErrorCode.HTTP_ERROR;
        this.lastError_ = this.getStatusText() + ' [' + this.getStatus() + ']';
        this.dispatchErrors_();
      }

      this.cleanUpXhr_();
    }
  }
};


/**
 * Remove the listener to protect against leaks, and nullify the XMLHttpRequest
 * object.
 * @param {boolean=} opt_fromDispose If this is from the dispose (don't want to
 *     fire any events).
 * @private
 */
goog.net.XhrIo.prototype.cleanUpXhr_ = function(opt_fromDispose) {
  if (this.xhr_) {
    // Save reference so we can mark it as closed after the READY event.  The
    // READY event may trigger another request, thus we must nullify this.xhr_
    var xhr = this.xhr_;
    var clearedOnReadyStateChange =
        this.xhrOptions_[goog.net.XmlHttp.OptionType.USE_NULL_FUNCTION] ?
            goog.nullFunction : null;
    this.xhr_ = null;
    this.xhrOptions_ = null;

    if (this.timeoutId_) {
      // Cancel any pending timeout event handler.
      goog.Timer.defaultTimerObject.clearTimeout(this.timeoutId_);
      this.timeoutId_ = null;
    }

    if (!opt_fromDispose) {
      this.dispatchEvent(goog.net.EventType.READY);
    }

    try {
      // NOTE(user): Not nullifying in FireFox can still leak if the callbacks
      // are defined in the same scope as the instance of XhrIo. But, IE doesn't
      // allow you to set the onreadystatechange to NULL so nullFunction is
      // used.
      xhr.onreadystatechange = clearedOnReadyStateChange;
    } catch (e) {
      // This seems to occur with a Gears HTTP request. Delayed the setting of
      // this onreadystatechange until after READY is sent out and catching the
      // error to see if we can track down the problem.
      this.logger_.severe('Problem encountered resetting onreadystatechange: ' +
                          e.message);
    }
  }
};


/**
 * @return {boolean} Whether there is an active request.
 */
goog.net.XhrIo.prototype.isActive = function() {
  return !!this.xhr_;
};


/**
 * @return {boolean} Whether the request has completed.
 */
goog.net.XhrIo.prototype.isComplete = function() {
  return this.getReadyState() == goog.net.XmlHttp.ReadyState.COMPLETE;
};


/**
 * @return {boolean} Whether the request completed with a success.
 */
goog.net.XhrIo.prototype.isSuccess = function() {
  var status = this.getStatus();
  // A zero status code is considered successful for local files.
  return goog.net.HttpStatus.isSuccess(status) ||
      status === 0 && !this.isLastUriEffectiveSchemeHttp_();
};


/**
 * @return {boolean} whether the effective scheme of the last URI that was
 *     fetched was 'http' or 'https'.
 * @private
 */
goog.net.XhrIo.prototype.isLastUriEffectiveSchemeHttp_ = function() {
  var scheme = goog.uri.utils.getEffectiveScheme(String(this.lastUri_));
  return goog.net.XhrIo.HTTP_SCHEME_PATTERN.test(scheme);
};


/**
 * Get the readystate from the Xhr object
 * Will only return correct result when called from the context of a callback
 * @return {goog.net.XmlHttp.ReadyState} goog.net.XmlHttp.ReadyState.*.
 */
goog.net.XhrIo.prototype.getReadyState = function() {
  return this.xhr_ ?
      /** @type {goog.net.XmlHttp.ReadyState} */ (this.xhr_.readyState) :
      goog.net.XmlHttp.ReadyState.UNINITIALIZED;
};


/**
 * Get the status from the Xhr object
 * Will only return correct result when called from the context of a callback
 * @return {number} Http status.
 */
goog.net.XhrIo.prototype.getStatus = function() {
  /**
   * IE doesn't like you checking status until the readystate is greater than 2
   * (i.e. it is recieving or complete).  The try/catch is used for when the
   * page is unloading and an ERROR_NOT_AVAILABLE may occur when accessing xhr_.
   * @preserveTry
   */
  try {
    return this.getReadyState() > goog.net.XmlHttp.ReadyState.LOADED ?
        this.xhr_.status : -1;
  } catch (e) {
    this.logger_.warning('Can not get status: ' + e.message);
    return -1;
  }
};


/**
 * Get the status text from the Xhr object
 * Will only return correct result when called from the context of a callback
 * @return {string} Status text.
 */
goog.net.XhrIo.prototype.getStatusText = function() {
  /**
   * IE doesn't like you checking status until the readystate is greater than 2
   * (i.e. it is recieving or complete).  The try/catch is used for when the
   * page is unloading and an ERROR_NOT_AVAILABLE may occur when accessing xhr_.
   * @preserveTry
   */
  try {
    return this.getReadyState() > goog.net.XmlHttp.ReadyState.LOADED ?
        this.xhr_.statusText : '';
  } catch (e) {
    this.logger_.fine('Can not get status: ' + e.message);
    return '';
  }
};


/**
 * Get the last Uri that was requested
 * @return {string} Last Uri.
 */
goog.net.XhrIo.prototype.getLastUri = function() {
  return String(this.lastUri_);
};


/**
 * Get the response text from the Xhr object
 * Will only return correct result when called from the context of a callback.
 * @return {string} Result from the server, or '' if no result available.
 */
goog.net.XhrIo.prototype.getResponseText = function() {
  /** @preserveTry */
  try {
    return this.xhr_ ? this.xhr_.responseText : '';
  } catch (e) {
    // http://www.w3.org/TR/XMLHttpRequest/#the-responsetext-attribute
    // states that responseText should return '' (and responseXML null)
    // when the state is not LOADING or DONE. Instead, IE and Gears can
    // throw unexpected exceptions, eg, when a request is aborted or no
    // data is available yet.
    this.logger_.fine('Can not get responseText: ' + e.message);
    return '';
  }
};


/**
 * Get the response XML from the Xhr object
 * Will only return correct result when called from the context of a callback.
 * @return {Document} The DOM Document representing the XML file, or null
 * if no result available.
 */
goog.net.XhrIo.prototype.getResponseXml = function() {
  /** @preserveTry */
  try {
    return this.xhr_ ? this.xhr_.responseXML : null;
  } catch (e) {
    this.logger_.fine('Can not get responseXML: ' + e.message);
    return null;
  }
};


/**
 * Get the response and evaluates it as JSON from the Xhr object
 * Will only return correct result when called from the context of a callback
 * @param {string=} opt_xssiPrefix Optional XSSI prefix string to use for
 *     stripping of the response before parsing. This needs to be set only if
 *     your backend server prepends the same prefix string to the JSON response.
 * @return {Object|undefined} JavaScript object.
 */
goog.net.XhrIo.prototype.getResponseJson = function(opt_xssiPrefix) {
  if (!this.xhr_) {
    return undefined;
  }

  var responseText = this.xhr_.responseText;
  if (opt_xssiPrefix && responseText.indexOf(opt_xssiPrefix) == 0) {
    responseText = responseText.substring(opt_xssiPrefix.length);
  }

  return goog.json.parse(responseText);
};


/**
 * Get the response as the type specificed by {@link #setResponseType}. At time
 * of writing, this is only directly supported in very recent versions of WebKit
 * (10.0.612.1 dev and later). If the field is not supported directly, we will
 * try to emulate it.
 *
 * Emulating the response means following the rules laid out at
 * http://www.w3.org/TR/XMLHttpRequest/#the-response-attribute
 *
 * On browsers with no support for this (Chrome < 10, Firefox < 4, etc), only
 * response types of DEFAULT or TEXT may be used, and the response returned will
 * be the text response.
 *
 * On browsers with Mozilla's draft support for array buffers (Firefox 4, 5),
 * only response types of DEFAULT, TEXT, and ARRAY_BUFFER may be used, and the
 * response returned will be either the text response or the Mozilla
 * implementation of the array buffer response.
 *
 * On browsers will full support, any valid response type supported by the
 * browser may be used, and the response provided by the browser will be
 * returned.
 *
 * @return {*} The response.
 */
goog.net.XhrIo.prototype.getResponse = function() {
  /** @preserveTry */
  try {
    if (!this.xhr_) {
      return null;
    }
    if ('response' in this.xhr_) {
      return this.xhr_.response;
    }
    switch (this.responseType_) {
      case goog.net.XhrIo.ResponseType.DEFAULT:
      case goog.net.XhrIo.ResponseType.TEXT:
        return this.xhr_.responseText;
        // DOCUMENT and BLOB don't need to be handled here because they are
        // introduced in the same spec that adds the .response field, and would
        // have been caught above.
        // ARRAY_BUFFER needs an implementation for Firefox 4, where it was
        // implemented using a draft spec rather than the final spec.
      case goog.net.XhrIo.ResponseType.ARRAY_BUFFER:
        if ('mozResponseArrayBuffer' in this.xhr_) {
          return this.xhr_.mozResponseArrayBuffer;
        }
    }
    // Fell through to a response type that is not supported on this browser.
    this.logger_.severe('Response type ' + this.responseType_ + ' is not ' +
                        'supported on this browser');
    return null;
  } catch (e) {
    this.logger_.fine('Can not get response: ' + e.message);
    return null;
  }
};


/**
 * Get the value of the response-header with the given name from the Xhr object
 * Will only return correct result when called from the context of a callback
 * and the request has completed
 * @param {string} key The name of the response-header to retrieve.
 * @return {string|undefined} The value of the response-header named key.
 */
goog.net.XhrIo.prototype.getResponseHeader = function(key) {
  return this.xhr_ && this.isComplete() ?
      this.xhr_.getResponseHeader(key) : undefined;
};


/**
 * Gets the text of all the headers in the response.
 * Will only return correct result when called from the context of a callback
 * and the request has completed.
 * @return {string} The value of the response headers or empty string.
 */
goog.net.XhrIo.prototype.getAllResponseHeaders = function() {
  return this.xhr_ && this.isComplete() ?
      this.xhr_.getAllResponseHeaders() : '';
};


/**
 * Get the last error message
 * @return {goog.net.ErrorCode} Last error code.
 */
goog.net.XhrIo.prototype.getLastErrorCode = function() {
  return this.lastErrorCode_;
};


/**
 * Get the last error message
 * @return {string} Last error message.
 */
goog.net.XhrIo.prototype.getLastError = function() {
  return goog.isString(this.lastError_) ? this.lastError_ :
      String(this.lastError_);
};


/**
 * Adds the last method, status and URI to the message.  This is used to add
 * this information to the logging calls.
 * @param {string} msg The message text that we want to add the extra text to.
 * @return {string} The message with the extra text appended.
 * @private
 */
goog.net.XhrIo.prototype.formatMsg_ = function(msg) {
  return msg + ' [' + this.lastMethod_ + ' ' + this.lastUri_ + ' ' +
      this.getStatus() + ']';
};


// Register the xhr handler as an entry point, so that
// it can be monitored for exception handling, etc.
goog.debug.entryPointRegistry.register(
    /**
     * @param {function(!Function): !Function} transformer The transforming
     *     function.
     */
    function(transformer) {
      goog.net.XhrIo.prototype.onReadyStateChangeEntryPoint_ =
          transformer(goog.net.XhrIo.prototype.onReadyStateChangeEntryPoint_);
    });
/**
 * Created with JetBrains PhpStorm.
 * User: fridek
 * Date: 22.06.12
 * Time: 23:09
 * To change this template use File | Settings | File Templates.
 */

goog.require('goog.net.XhrIo');
goog.require('goog.events');

goog.provide('prezentacja.Loader');

/**
 * @constructor
 */
prezentacja.Loader = function() {

};

prezentacja.Loader.prototype.loadNewPageHtml = function(target) {
    var xhr_ = new goog.net.XhrIo();

    goog.events.listen(xhr_, goog.net.EventType.COMPLETE, function(e) {
        var html = this.getResponseText();
        target.innerHTML = html;
    });

    xhr_.send('http://localhost/prezentacja_closure/public/index/paginationhtml');
};/**
 * Created with JetBrains PhpStorm.
 * User: fridek
 * Date: 22.06.12
 * Time: 22:59
 * To change this template use File | Settings | File Templates.
 */

goog.require('goog.dom');
goog.require('goog.events');

goog.require('prezentacja.Loader');

goog.provide('prezentacja.Start1');

/**
 *
 * @constructor
 */
prezentacja.Start1 = function() {
    /**
     * @type {Element}
     */
    var button = goog.dom.getElement('next-page');

    var table = goog.dom.getElement('table-contents');

    /**
     * @type {prezentacja.Loader}
     * @private
     */
    this.loader_ = new prezentacja.Loader();

    goog.events.listen(button, goog.events.EventType.CLICK, function(e) {
        this.loader_.loadNewPageHtml(table);
        e.preventDefault();
    }, false, this);

    this.loader_.loadNewPageHtml(table);
};

new prezentacja.Start1();
