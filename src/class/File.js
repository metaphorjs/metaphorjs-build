
var fs              = require("fs"),
    path            = require("path"),
    resolvePath     = require("../func/resolvePath.js"),
    nextUid         = require("metaphorjs/src/func/nextUid.js");



module.exports = function(){


    var rStrict         = new RegExp("'use "+ "strict'|" + '"use ' + 'strict";?', "g"),
        rRequires       = /([^\s]+)\s*=\s*require\(['|"]([^)]+)['|"]\)\s*,?/,
        rInclude        = /[^=\s]?\s*(require\(['|"]([^)]+)['|"]\);?)/,
        rEmptyVar       = /var[\s|,]*;/g,
        rVarSpace       = /var\s+/g,
        rTrailComma     = /,\s*;/g,



        allFiles        = {},

        getOrCreate     = function(file) {

            if (!allFiles[file]) {
                allFiles[file] = new File(file);
            }

            return allFiles[file];
        };




    var File = function(filePath, temporary) {

        var self    = this;

        self.id         = "_f_" + nextUid();
        self.base       = path.dirname(filePath) + "/";
        self.path       = filePath;
        self.as         = [];
        self.requires   = [];
        self.requiredBy = [];
        self.localRequires = [];

        self.reqNames   = {};

        self.temporary  = temporary;

        self.process();
        self.findUnused();
    };

    File.prototype = {

        id: null,
        base: null,
        path: null,
        content: "",
        as: null,
        requires: null,
        requiredBy: null,
        processed: false,
        reqNames: null,

        requiresUniqueAlias: false,
        localRequires: null,
        wrap: false,
        temporary: false,

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

            //if (!as.length) {
            //    self.addAs("*");
            //    as          = self.as.slice();
            //}

            options = options || {};

            if (this.requiresUniqueAlias) {
                as.push(this.id);
            }

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

                //if (this.wrap) {
                //    content = "(function(){\n"+content+"\n}());";
                //}

                content = content.replace(rStrict, "");
            }

            return content;
        },

        process:function() {

            var self        = this,
                content     = fs.readFileSync(self.path).toString(),
                base        = self.base,
                start       = 0,
                required,
                matches;

            if (self.processed) {
                return;
            }

            while (matches = rRequires.exec(content.substr(start))) {

                required    = resolvePath(matches[2], [base]);

                if (required === true) {
                    start += matches.index + matches[2].length;
                    continue;
                }
                else if (required === false) {
                    throw matches[2] + " required in " + self.path + " does not exist";
                }

                content     = content.replace(matches[0], "");

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
            content = content.replace(rTrailComma, ";");
            start   = 0;

            while (matches = rInclude.exec(content.substr(start))) {

                required    = resolvePath(matches[2], [base]);

                if (required === true) {
                    start += matches[2].length;
                    continue;
                }
                else if (required === false) {
                    throw matches[2] + " required in " + self.path + " does not exist";
                }

                content     = content.replace(matches[1], "");
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

        addLocalRequired: function(desiredName, fileId) {
            this.localRequires.push({
                desiredName: desiredName,
                fileId: fileId
            })
        },

        addRequiredBy: function(file) {
            this.requiredBy.push(file);
        },


        getDefaultAlias: function() {
            var as = path.basename(this.path, ".js");
            if (as.indexOf(".") != -1 || as.indexOf("-") != -1) {
                return null;
            }
            return as;
        },

        addAs: function(as) {
            var self = this;

            if (as == "*") {
                as = self.getDefaultAlias();
                if (!as) {
                    return;
                }
            }

            if (as && self.as.indexOf(as) == -1) {
                self.as.push(as);
            }
        },

        removeAs: function(as) {
            var self = this,
                inx;
            if ((inx = self.as.indexOf(as)) != -1) {
                self.as.splice(inx,1);
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
        },

        needsWrapping: function() {

        }
    };

    File.getOrCreate = getOrCreate;

    File.exists = function(filePath) {
        return !!allFiles[filePath];
    };

    File.get = function(filePath) {
        return allFiles[filePath];
    };

    File.removeDupReqs = function(content) {

        var matches,
            required,
            name,
            start = 0,
            used = {};

        while (matches = rRequires.exec(content.substr(start))) {

            name        = matches[1];
            required    = matches[2];

            if (used[name]) {
                content = content.substr(0, start + matches.index) +
                          content.substr(start + matches.index + matches[0].length);
            }
            else {
                used[name] = true;
                start += matches.index + matches[0].length;
            }
        }

        content = content.replace(rEmptyVar, "");
        content = content.replace(rTrailComma, ";");
        content = content.replace(rVarSpace, "var ");

        return content;
    };

    return File;

}();