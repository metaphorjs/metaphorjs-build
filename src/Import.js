
var Base = require("./Base.js"),
    extend = require("metaphorjs/src/func/extend.js"),
    nextUid = require("metaphorjs/src/func/nextUid.js");

/**
 * @class Import
 */
module.exports = Base.$extend({
    $class: "Import",

    id: null,
    type: null,
    module: null,
    file: null,
    sub: null,
    in: null,
    names: null, // import as
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
    $init: function(cfg) {

        this.names = [];
        this.fromMap = {};
        this.id = nextUid();
        extend(this, cfg, true, false);
    },

    /**
     * Create copy of this import
     * @method
     */
    createCopy: function() {
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
    is: function(def) {
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
    isSkipped: function() {
        return this.skip;
    },

    /**
     * Set this file skipped
     * @method
     * @param {bool} state
     */
    setSkipped: function(state) {
        this.skip = state;
    },

    /**
     * Is this a module import
     * @method
     * @returns {bool}
     */
    isModule: function() {
        return this.module !== null;
    },
    
    /**
     * Is this a file import
     * @method
     * @returns {bool}
     */
    isFile: function() {
        return this.file !== null;
    },

    /**
     * Add names to which import is assigned
     * @method
     * @param {array} names
     */
    addNames: function(names) {
        names.forEach(this.addName, this);
    },

    /**
     * Add files in which import happens
     * @method
     * @param {array} in
     */
    addIn: function(parents) {
        var self = this;
        parents.forEach(function(parent){
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
    addName: function(name) {
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
    hasName: function(name) {
        return this.names.indexOf(name) !== -1;
    },

    /**
     * Remove assigned name
     * @method
     * @param {string} name
     */
    removeName: function(name) {
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
    setNameFrom: function(name, from) {
        this.fromMap[name] = from;
    },

    /**
     * Get import code
     * @method
     * @returns {string}
     */
    getCode: function() {
        return "require(\"" + this.module + "\");"
    },

    /**
     * @ignore
     */
    toString: function() {
        return this.getCode();
    }
});