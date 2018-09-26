
var ns = require("metaphorjs-namespace/src/var/ns.js");

/**
 * @mixin mixin.WithImports
 */
module.exports = ns.register("mjs.mixin.WithImports", {

    imports: null,
    importedBy: null,

    $beforeInit: function() {
        this.imports = [];
        this.importedBy = [];
    },

    $afterInit: function() {
        var self = this;

        self.$$observable.createEvent("add-import", false);
        self.$$observable.createEvent("add-imported-by", false);

        self.on("add-import", function(def){
            return !self.doesImport(def);
        });

        self.on("add-imported-by", function(def){
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
    doesImport: function(def) {
        return !!this.imports.find(function(imp){
            return imp.is(def);
        });
    },

    /**
     * Get import definition
     * @method
     * @param {Import|object} def
     * @returns {Import|null}
     */
    getImport: function(def) {
        return this.imports.find(function(imp){
            return imp.is(def);
        });
    },

    /**
     * Does this file import another file
     * @method
     * @param {File} file
     * @returns bool
     */
    doesImportFile: function(file) {
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
    doesImportModule: function(name, sub) {
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
    addImport: function(imp) {
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
    isImportedBy: function(file) {
        return !!this.importedBy.find(function(imp){
            return imp.file === file;
        });
    },

    /**
     * Get import definition of parent file
     * @method
     * @param {File} file
     * @returns {Import}
     */
    getImportedBy: function(file) {
        return this.importedBy.find(function(imp){
            return imp.file === file;
        });
    },

    /**
     * Add link to parent file
     * @method
     * @param {Import} imp
     */
    addImportedBy: function(imp) {
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
    getImports: function(type, deep, copy){
        var imports = [],
            self = this;

        if (typeof copy == "undefined") {
            copy = true;
        }

        var filter = function(imp){
            if (!type || 
                (type === "module" && imp.module) ||
                (type === "file" && imp.file)) {
                imports.push(copy ? imp.createCopy() : imp);
            }
        };

        if (deep && self.buildList) {
            self.buildList.forEach(function(entry){
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
    getParents: function() {
        return this.importedBy.slice();
    }
});