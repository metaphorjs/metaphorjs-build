
var cls = require("metaphorjs-class/src/cls.js"),
    copy = require("metaphorjs/src/func/copy.js"),
    isArray = require("metaphorjs/src/func/isArray.js");

require("metaphorjs-observable/src/mixin/Observable.js");

module.exports = cls({

    $class: "Base",
    $mixins: ["mixin.Observable"],

    $init: function(options) {
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
    getOption: function(name, defValue) {
        return this.options[name] || defValue || null;
    },

    /**
     * Get all options
     * @method
     * @returns {object}
     */
    getOptions: function() {
        return copy(this.options);
    },

    /**
     * Set options
     * @method
     * @param {object} opts
     */
    setOptions: function(opts) {
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
    setOption: function(name, value) {
        if (this.$$observable.hasEvent("set_" + name)) {
            this.trigger("set_" + name, value, this, name);
        }
        else {
            this.options[name] = value;
        }
    },

    _setArrayOption: function(value, self, name) {
        var curr = this.getOption(name);

        if (!isArray(value)) {
            value = [value];
        }

        if (curr === null) {
            curr = [];
        }

        value.forEach(function(v){
            if (curr.indexOf(v) === -1) {
                curr.push(v);
            }
        });

        this.options[name] = curr;
    }

});