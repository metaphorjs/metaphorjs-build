
var fs              = require("fs"),
    path            = require("path"),

    rStrict         = /'use strict'|"use strict";?/g,
    rRequires       = /([^\s]+)\s*=\s*require\(['|"]([^)]+)['|"]\)/,
    rInclude        = /[^=\s]?\s*(require\(['|"]([^)]+)['|"]\);?)/,
    rEmptyVar       = /var[\s|,]*;/g,

    isFile          = require("../lib/isFile.js"),

    allFiles        = {},

    getOrCreate     = function(file) {

        if (!allFiles[file]) {
            allFiles[file] = new File(file);
        }

        return allFiles[file];
    };




var File = function(filePath) {

    var self    = this;

    self.base       = path.dirname(filePath) + "/";
    self.path       = filePath;
    self.as         = [];
    self.requires   = [];
    self.requiredBy = [];

    self.reqNames   = {};

    self.process();
    self.findUnused();
};

File.prototype = {

    base: null,
    path: null,
    content: "",
    as: null,
    requires: null,
    requiredBy: null,
    processed: false,
    reqNames: null,

    /**
     * @param {Object} options
     * @returns {string}
     */
    getContent: function(options) {

        var self        = this,
            content     = self.content,
            as          = self.as.slice(),
            inx,
            match,
            name, funcName;

        options = options || {};

        if (!options.keepExports && content.indexOf("module.exports") != -1) {

            if (options.returnExports) {

                content     = content.replace(/module\.exports\s*=/, "return");

            }
            else {

                match       = /module\.exports\s*=\s*([^(\['"+. ]+)\s*;/.exec(content);
                name        = match ? match[1] : null;

                match       = /module\.exports\s*=\s*function\s+([^( ]+)/i.exec(content);
                funcName    = match ? match[1] : null;

                if (name && (inx = as.indexOf(name)) != -1) {
                    as.splice(inx, 1);
                }

                if (name && as.length == 0) {
                    content = content.replace(/module\.exports\s*=\s*[^;]+;/, "");
                }
                else {

                    if (as.length == 0 || (funcName && as.length == 1 && as[0] == funcName)) {
                        content = content.replace(/module\.exports\s*=\s*/, "");
                        //throw "No export names found for " + self.path + "; required by: " + self.requiredBy.join(", ");
                    }
                    else {

                        if (as.length > 1) {
                            content = "var " + as.join(", ") + ";\n" + content;
                            content = content.replace("module.exports", as.join(" = "));
                        }
                        else {

                            content = content.replace("module.exports", "var " + as[0]);
                        }
                    }
                }
            }

            content = content.replace(rStrict, "");
        }

        return content;
    },

    process:function() {

        var self        = this,
            content     = fs.readFileSync(self.path).toString(),
            base        = self.base,
            required,
            matches;

        if (self.processed) {
            return;
        }

        while (matches = rRequires.exec(content)) {
            content     = content.replace(matches[0], "");
            required    = path.normalize(base + matches[2]);

            if (!isFile(required)) {
                throw required + " required in " + self.path + " does not exist";
            }

            self.reqNames[matches[1]] = required;

            required    = getOrCreate(required);
            required.addAs(matches[1]);

            if (required.doesRequire(self.path)) {
                throw "Two files require each other: " + required.path + " <-> " + self.path;
            }

            self.addRequired(required.path);
            required.addRequiredBy(self.path);
        }

        content = content.replace(rEmptyVar, "");

        while (matches = rInclude.exec(content)) {
            content     = content.replace(matches[1], "");
            required    = path.normalize(base + matches[2]);

            if (!isFile(required)) {
                throw required + " required in " + self.path + " does not exist";
            }

            required    = getOrCreate(required);

            if (required.doesRequire(self.path)) {
                throw "Two files require each other: " + required.path + " <-> " + self.path;
            }

            self.addRequired(required.path);
            required.addRequiredBy(self.path);
        }


        self.content    = content;
        self.processed  = true;
    },

    doesRequire: function(file) {
        return this.requires.indexOf(file) != -1;
    },

    addRequired: function(file) {
        var self = this;

        if (self.requires.indexOf(file) == -1) {
            self.requires.push(file);
        }
    },

    addRequiredBy: function(file) {
        this.requiredBy.push(file);
    },

    addAs: function(as) {
        var self = this;

        if (as == "*") {
            as = path.basename(self.path, ".js");
        }

        if (self.as.indexOf(as) == -1) {
            self.as.push(as);
        }
    },

    findUnused: function() {
        var self        = this,
            content     = self.content,
            name,
            reg;

        for (name in self.reqNames) {

            reg = new RegExp('[^a-zA-Z0-9]'+name+'[^a-zA-Z0-9]');

            if (!content.match(reg)) {
                console.log("Unused requirement " + name + " in " + self.path);
            }
        }
    }
};

File.getOrCreate = getOrCreate;

File.exists = function(filePath) {
    return !!allFiles[filePath];
};

File.get = function(filePath) {
    return allFiles[filePath];
};

module.exports = File;