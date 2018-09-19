
var Base = require("../../Base.js"),
    File = require("../../File.js");

module.exports = Base.$extend({

    $class: "plugin.bundle.Names",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this;
        self.host.on("prepare-module-names", self.prepareModuleNames, self);
        self.host.on("prepare-file-names", self.prepareFileNames, self);
    },

    prepareModuleNames: function(bundle) {

        // iterate through all module imports collected from all files
        bundle.imports.forEach(function(imp) {

            var firstGlobal;

            imp.names = imp.names.slice().filter(function(name) {

                var used = false;

                // if name hasn't been used
                // everything is ok
                if (!bundle.globals.hasOwnProperty(name)) {
                    bundle.globals[name] = imp.module;
                    !firstGlobal && (firstGlobal = name);
                }
                else {
                    used = true;
                }

                imp.in.forEach(function(file) {
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
                    }
                    else {
                        // the name is conflicting with others.
                        // if by that time we don't have one global name,
                        // we use import id.
                        !firstGlobal && (firstGlobal = imp.id);
                        imp.addName(firstGlobal);
                        bundle.globals[firstGlobal] = true;

                        // then we wrap the file 
                        // and use the name locally,
                        // assigning it from gloval var
                        file.setOption("wrap", true);
                        local.setNameFrom(name, firstGlobal);
                    }
                });

                // remove conflicting names from bundle's import list
                return !used;
            }); 
        });
    },


    prepareFileNames: function(bundle) {

        // iterate over files on top level
        bundle.buildList.forEach(function(file) {
            if (file instanceof File) {

                file.getParents().forEach(function(imp) {

                    var firstGlobal;

                    imp.names = imp.names.slice().filter(function(name) {

                        var used = false;

                        // if name hasn't been used
                        // everything is ok
                        if (!bundle.globals.hasOwnProperty(name) ||
                            bundle.globals[name] == file.path) {
                                
                            bundle.globals[name] = file.path;
                            !firstGlobal && (firstGlobal = name);
                            file.setOption("as", name);   
                        }
                        else {
                            used = true;
                            // the name is conflicting with others.
                            // if by that time we don't have one global name,
                            // we use import id.
                            !firstGlobal && (firstGlobal = file.id);
                            bundle.globals[firstGlobal] = true;
                            file.setOption("as", firstGlobal);
                        }

                        // if this file is imported from outside
                        // current bundle; or global name is taken
                        if (!file.bundle.hasFile(imp.file) || used) {

                            imp.file.setOption("wrap", true);
                            var local = imp.file.getImport({file: file});
                            if (local) {
                                local.setNameFrom(
                                    name, 
                                    [file.bundle.getUniqueName(), firstGlobal]);
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