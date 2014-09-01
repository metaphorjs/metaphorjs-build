
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

    self.process();
};

File.prototype = {

    base: null,
    path: null,
    content: "",
    as: null,
    requires: null,
    requiredBy: null,
    processed: false,

    /**
     * @param {Object} options
     * @returns {string}
     */
    getContent: function(options) {

        var self        = this,
            content     = self.content,
            as          = self.as,
            inx,
            match,
            name;

        options = options || {};

        if (!options.keepExports && content.indexOf("module.exports") != -1) {

            if (options.returnExports) {

                content     = content.replace(/module\.exports\s*=/, "return");

            }
            else {

                match       = /module\.exports\s*=\s*([^;]+);/.exec(content);
                name        = match[1];

                if (name.match(/[{(\['"+.]/)) {
                    name    = null;
                }

                if ((inx = as.indexOf(name)) != -1) {
                    as.splice(inx, 1);
                }

                if (name && as.length == 0) {
                    content = content.replace(/module\.exports\s*=\s*[^;]+;/, "");
                }
                else {

                    if (as.length == 0) {
                        content = content.replace(/module\.exports\s*=/, "");
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

        if (self.as.indexOf(as) == -1) {
            self.as.push(as);
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