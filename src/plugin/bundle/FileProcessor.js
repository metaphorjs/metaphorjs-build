
var Base = require("../../Base.js"),
    File = require("../../File.js");

module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.bundle.FileProcessor",
    host: null,

    $constructor: function() {
        this.$super(arguments);
    },

    $init: function(host) {
        this.host = host;
        this.bsStack = [];
    },

    $afterHostInit: function() {
        var self = this;
        self.host.on("process-file", self.omitFile, self);
        self.host.on("process-file", self.replaceFile, self);
        self.host.on("process-file", self.processFileReqs, self);
    },

    processFileReqs: function(file, bundle) {

        if (file && file instanceof File) {
            var self = this;

            self.bsStack.push(file.path);

            if (self.bsStack.length > 50) {
                console.log(self.bsStack);
                throw "Recursive requirement";
            }

            file.processReqs();
            file.getImports().forEach(function(imp){
                if (imp.isFile()) {
                    bundle.addFile(imp.file);
                }
                var code = file.getCurrentContent();
                imp.names.forEach(function(name){
                    var reg = new RegExp('[^a-zA-Z0-9]'+name+'[^a-zA-Z0-9]');
                    if (!code.match(reg)) {
                        console.log("Unused requirement " + name + " in " + file.path);
                    }
                });
            });

            self.bsStack.pop();
        }

        return file;
    },

    replaceFile: function(file, bundle) {

        if (file && file instanceof File) {
            var replace = bundle.allReplaces;
            while (replace[file.path]) {
                file = this.host.builder.getFile(replace[file.path]);
            }
        }

        return file;
    },

    omitFile: function(file, bundle) {

        if (file && file instanceof File) {
            var omit = bundle.allOmits;
            if (omit[file.path]) {
                return null;
            }
        }

        return file;
    }

});