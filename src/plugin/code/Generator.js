var Base = require("../../Base.js");

module.exports = Base.$extend({

    $class: "plugin.code.Generator",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this,
            host = this.host;

        host.$$observable.createEvent("code-wrap", "pipe");
        host.$$observable.createEvent("code-replace-export", "pipe");
        host.$$observable.createEvent("code-prepend-var", "pipe");
        host.$$observable.createEvent("code-return", "pipe");
        host.$$observable.createEvent("code-expose", "pipe");
        host.$$observable.createEvent("code-module-imports", "concat");
        host.$$observable.createEvent("code-wrapped-imports", "concat");
        host.$$observable.createEvent("code-export", "first");
        host.$$observable.createEvent("code-global", "first");
        host.$$observable.createEvent("code-amd-module", "first");

        host.on("code-wrap", self.wrap, self);
        host.on("code-replace-export", self.replaceEs5Export, self);
        host.on("code-replace-export", self.replaceEs6Export, self);
        host.on("code-prepend-var", self.prependVar, self);
        host.on("code-return", self.returnVar, self);
        host.on("code-expose", self.exposeVars, self);
        host.on("code-module-imports", self.moduleImports, self);
        host.on("code-wrapped-imports", self.wrappedImports, self);
        host.on("code-export", self.export, self);
        host.on("code-global", self.exposeGlobal, self);
        host.on("code-amd-module", self.amdModule, self);
    },

    wrap: function(code) {
        return "(function(){\n" + code + "\n}());";
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

    returnVar: function(code, varName) {
        if (varName) {
            return code + "\n\nreturn " + varName + ";\n";
        }
        return code;
    },

    prependVar: function(code, varName) {
        return "var " + varName + " = " + code;
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

    exposeVars: function(code, exposeIn, exposeList) {
        var exp = "\nvar " + exposeIn + " = {};\n";
        exposeList.forEach(function(name){
            exp += exposeIn + "['" + name + "'] = " + name + ";\n";
        });

        return code + exp;
    },

    export: function(name) {
        if (name) {
            return "\nmodule.exports = " + name + ";\n";
        }
        else {
            return "\nmodule.exports = ";
        }
    },

    exposeGlobal: function(name, exposeName) {
        return "\ntypeof global != \"undefined\" ? " +
                    "(global['"+name+"'] = "+ exposeName +") : "+
                    "(window['"+name+"'] = "+ exposeName +");\n";
    },

    amdModule: function(code, def, bundle) {
        var defName = def.name,
            defDeps = def.deps,
            defRet  = def.return,
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
    }
});