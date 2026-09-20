/* Polyfills for older browsers (webOS 4.x / Chromium 68) */
(function () {
  if (typeof window === 'undefined') return;

  if (typeof globalThis === 'undefined') {
    Object.defineProperty(Object.prototype, '__globalThis__', {
      get: function () { return this; },
      configurable: true,
    });
    // eslint-disable-next-line no-undef
    __globalThis__;
    delete Object.prototype.__globalThis__;
  }

  if (typeof Promise.prototype.finally !== 'function') {
    Promise.prototype.finally = function (callback) {
      return this.then(
        function (value) { return Promise.resolve(callback()).then(function () { return value; }); },
        function (reason) { return Promise.resolve(callback()).then(function () { throw reason; }); }
      );
    };
  }

  if (typeof Array.prototype.flat !== 'function') {
    Array.prototype.flat = function (depth) {
      depth = depth !== undefined ? Number(depth) : 1;
      if (Number.isNaN(depth)) depth = 1;
      var stack = [];
      flattenIntoArray(this, stack, depth, 0);
      return stack;
    };
    function flattenIntoArray(source, target, depth, start) {
      var targetIndex = start;
      var sourceIndex = 0;
      var sourceLen = source.length >>> 0;
      while (sourceIndex < sourceLen) {
        var value = source[sourceIndex];
        if (value !== undefined && value !== null) {
          if (depth > 0 && Array.isArray(value)) {
            targetIndex = flattenIntoArray(value, target, depth - 1, targetIndex);
          } else {
            target[targetIndex++] = value;
          }
        }
        sourceIndex++;
      }
      return targetIndex;
    }
  }

  if (typeof Array.prototype.flatMap !== 'function') {
    Array.prototype.flatMap = function (callback) {
      return Array.prototype.map.call(this, callback).flat();
    };
  }

  if (typeof Array.prototype.at !== 'function') {
    Array.prototype.at = function (index) {
      index = Math.trunc(index) || 0;
      if (index < 0) index += this.length;
      if (index < 0 || index >= this.length) return undefined;
      return this[index];
    };
  }

  if (typeof String.prototype.at !== 'function') {
    String.prototype.at = function (index) {
      index = Math.trunc(index) || 0;
      if (index < 0) index += this.length;
      if (index < 0 || index >= this.length) return undefined;
      return this[index];
    };
  }

  if (typeof Object.fromEntries !== 'function') {
    Object.fromEntries = function (iterable) {
      var obj = {};
      var entries = iterable.entries ? iterable.entries() : iterable;
      var item;
      while (!(item = entries.next()).done) {
        obj[item.value[0]] = item.value[1];
      }
      return obj;
    };
  }

  if (typeof String.prototype.replaceAll !== 'function') {
    String.prototype.replaceAll = function (search, replacement) {
      if (search instanceof RegExp) {
        if (!search.global) {
          throw new TypeError('String.prototype.replaceAll: RegExp must have global flag');
        }
        return this.replace(search, replacement);
      }
      var str = String(this);
      var searchStr = String(search);
      if (searchStr === '') return str;
      var result = '';
      var index = 0;
      while (true) {
        var found = str.indexOf(searchStr, index);
        if (found === -1) {
          result += str.slice(index);
          break;
        }
        result += str.slice(index, found) + replacement;
        index = found + searchStr.length;
      }
      return result;
    };
  }

  if (typeof Array.prototype.includes !== 'function') {
    Array.prototype.includes = function (searchElement, fromIndex) {
      var O = Object(this);
      var len = parseInt(O.length, 10) || 0;
      if (len === 0) return false;
      var n = parseInt(fromIndex, 10) || 0;
      var k;
      if (n >= 0) {
        k = n;
      } else {
        k = len + n;
        if (k < 0) k = 0;
      }
      while (k < len) {
        var current = O[k];
        if (current === searchElement || (current !== current && searchElement !== searchElement)) {
          return true;
        }
        k++;
      }
      return false;
    };
  }

  if (typeof structuredClone === 'undefined') {
    window.structuredClone = function (obj) {
      return JSON.parse(JSON.stringify(obj));
    };
  }

  if (typeof window.customElements === 'undefined' && window.customElements) {
    // customElements should exist in Chromium 68, but guard against missing API
  }
})();
