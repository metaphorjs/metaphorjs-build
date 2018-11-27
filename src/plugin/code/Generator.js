var Base = require("../../Base.js"),
    path = require("path"),
    fs = require("fs");
    

module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.code.Generator",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this,
            host = this.host;

        host.$$observable.createEvent("code-wrap", "first");
        host.$$observable.createEvent("code-replace-export", "pipe");
        host.$$observable.createEvent("code-prepend-var", "first");
        host.$$observable.createEvent("code-return", "first");
        host.$$observable.createEvent("code-expose", "first");
        host.$$observable.createEvent("code-module-imports", "concat");
        host.$$observable.createEvent("code-wrapped-imports", "concat");
        host.$$observable.createEvent("code-export", "first");
        host.$$observable.createEvent("code-global", "first");
        host.$$observable.createEvent("code-amd-module", "first");
        host.$$observable.createEvent("code-require", "first");
        host.$$observable.createEvent("code-prepend", "first");
        host.$$observable.createEvent("code-append", "first");
        host.$$observable.createEvent("code-prebuilt-var", "first");

        host.on("code-wrap", self.wrap, self);
        host.on("code-replace-export", self.replaceEs5Export, self);
        host.on("code-replace-export", self.replaceEs6Export, self);
        host.on("code-prepend-var", self.prependVar, self);
        host.on("code-return", self.returnVar, self);
        host.on("code-expose", self.expose, self);
        host.on("code-module-imports", self.moduleImports, self);
        host.on("code-wrapped-imports", self.wrappedImports, self);
        host.on("code-export", self.export, self);
        host.on("code-global", self.exposeGlobal, self);
        host.on("code-amd-module", self.amdModule, self);
        host.on("code-require", self.requireMods, self);
        host.on("code-prepend", self.addFiles, self);
        host.on("code-append", self.addFiles, self);
        host.on("code-prebuilt-var", self.generatePrebuilt, self);
    },

    wrap: function(code, wrapCfg) {
        if (!wrapCfg || wrapCfg === true) {
            return "(function(){\n" + code + "\n}());";
        }
        var wrapArgs    = "";
        if (wrapCfg.args) {
            wrapArgs =  wrapCfg.args.join(", ");
        }

        var ret = wrapCfg.return ? "\nreturn " + wrapCfg.return + ";\n" : "";
        
        var wrapName    = wrapCfg.name || "";

        var wrapStart   = wrapCfg.start ||
                            wrapCfg.deferred ?
                                "function "+wrapName+"("+wrapArgs+") {\n" :
                                "(function("+wrapArgs+"){\n";

        if (wrapCfg.exports) {
            wrapStart = "\nmodule.exports = " + wrapStart;
        }

        var wrapEnd     = wrapCfg.end ||
                            (ret + (wrapCfg.deferred ?
                                    "\n};" :
                                    "\n}("+wrapArgs+"));"));
        return wrapStart + code + wrapEnd;
    },

    replaceEs5Export: function(code, action) {
        var repl = "";
        if (action) {
            if (action.varName) { 
                repl = "var " + action.varName + " = ";
            }
            else if (action.return) {
                repl = "return ";
            }
            else if (action.removeAll) {
                return code.replace(/module\s*\.exports\s*=\s*[^\s]+\s*;?/, "");        
            }
        }

        return code.replace(/module\s*\.exports\s*=\s*/, repl);
    },

    replaceEs6Export: function(code, withWhat) {
        return code;
    },

    returnVar: function(code, ret) {
        if (ret) {
            if (ret === true) {
                return "\nreturn __mjsExport;\n";    
            }
            else if (typeof ret === "string") {
                return "\nreturn " + ret + ";\n";
            }
        }
        return "";
    },

    prependVar: function(prepend) {
        return "var " + prepend + " = ";
    },

    

    moduleImports: function() {
        var self = this,
            bundle = self.host,
            code = "\nvar ",
            all = [];

        bundle.getImports("module").forEach(function(imp){
            all = all.concat(imp.names);
        });

        if (all.length) {

            code += all.join(", ") + ";\n";
            code += bundle.getImports("module")
                    .map(function(imp){
                        return imp.names.join(" = ") + 
                                " = " +
                                "require(\"" + imp.module + "\")" + 
                                (imp.sub || "");
                    })
                    .join(";\n") + ";\n";

            return [code];
        }
        
        return [""];
    },

    wrappedImports: function() {
        var self = this,
            file = self.host,
            code = [];

        file.getImports("file").forEach(function(imp){
            for (var name in imp.fromMap) {
                var from = imp.fromMap[name];
                if (typeof from === "string") {
                    from = [from];
                }
                code.push("var " + name + " = " + from.join(".") + ";");
            }
        });

        if (code.length) {
            code.unshift("\n");
        }

        return code;
    },

    expose: function(expose, bundle) {

        if (typeof expose === "string") {
            expose = [expose];
        }
        if (expose[0] == '**') {
            expose = bundle.getGlobalNames();
        }
        var exp = "\nvar __mjsExport = {};\n";

        expose.forEach(function(entry) {
            var key, name;
            if (typeof entry === "string") {
                key = name = entry;
            }
            else {
                key = entry.as;
                name = entry.name;
            }

            exp += "__mjsExport['" + key + "'] = " + name + ";\n";
        });

        return exp;
    },

    export: function(name) {
        if (name) {
            if (name === true) {
                return "\nmodule.exports = __mjsExport;\n";
            }
            else {
                return "\nmodule.exports = " + name + ";\n";
            }
        }
        else {
            return "\nmodule.exports = ";
        }
    },

    exposeGlobal: function(globlCfg) {

        var name = "MetaphorJs",
            exposed = "__mjsExport";

        if (globlCfg) {
            if (globlCfg !== true) {
                if (typeof globlCfg === "string") {
                    name = globlCfg;
                }
                else {
                    name = globlCfg.as || name;
                    exposed = globlCfg.expose || exposed;
                }
            }
        }

        return "\ntypeof global != \"undefined\" ? " +
                    "(global['"+name+"'] = "+ exposed +") : "+
                    "(window['"+name+"'] = "+ exposed +");\n";
    },

    amdModule: function(code, def, bundle) {

        var defName = def.name,
            defDeps = def.deps,
            defRet  = def.return || "__mjsExport",
            start   = 'define("'+ defName +'", ',
            end     = "\n});\n",
            deps    = [],
            args    = [],
            dep;

        if (defDeps) {
            for (dep in defDeps) {
                deps.push("'" + dep + "'");
                args.push(defDeps[dep]);
            }
            start   += '[' + deps.join(", ") + '], ';
            start   += 'function(' + args.join(", ") + ') {' + "\n";
        }
        else {
            start += "function() {\n";
        }

        if (defRet) {
            end     = "\nreturn " + defRet + ";" + end;
        }

        return start + code + end + "\n";
    },

    requireMods: function(mods) {
        var code = "",
            parts = [],
            mod, varName, part, req;

        for (var mod in mods) {
            req = mods[mod];
            if (typeof req === "string") {
                varName = req;
            }
            else {
                varName = req.as;
            }
            part = varName + ' = require("'+ mod +'")';

            if (req.args) {
                part += '(';
                part += req.args.join(", ");
                part += ')';
            }

            parts.push(part);
        }

        if (parts.length) {
            code = "\nvar " + parts.join(",\n") + ";\n";
        }

        return code;
    },

    addFiles: function(files, bundle) {
        code = "";
        files.forEach(function(file) {
            var filePath = path.normalize(bundle.builder.config.base + file);
            code += fs.readFileSync(filePath).toString();
            code += "\n";
        });
        return code;
    },

    generatePrebuilt: function(prebuiltObj) {
        if (prebuiltObj) {
            return "var MetaphorJsPrebuilt = " + JSON.stringify(prebuiltObj);
        }
        return "";
    }
});