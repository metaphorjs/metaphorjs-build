var Base = require("../../Base.js"),
    esprima = require("esprima");

/**
 * @plugin plugin.file.CodeInfo
 */
module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.code.Info",
    host: null,

    $init: function(host) {
        this.host = host;
    },
    
    $afterHostInit: function() {
        var self = this;
        self.host.on("collect-code-info", self.onCollectCodeInfo, self);
        self.host.on("collect-imports", self.getFileReqs, self);
        self.host.on("decide-wrapping", self.needsWrapping, self);
        self.host.on("decide-module-exports", self.whatToDoWithEs5Export, self);
    },

    onCollectCodeInfo: function(code) {
        var estree = esprima.parseModule(code),
            body = estree.body,
            self = this,
            stats = {
                "module.exports": null,
                "wrappedFuncCall": 0,
                "rootFuncCall": 0,
                "total": 0,
                "firstIdentifier": null,
                "firstIdType": null,
                "firstIdExpression": 0,
                "declarations": 0,
                "statements": 0,
                "expressions": 0,
                "exportsAnonymous": false,
                "exportsFirstId": false
            },
            typeReg = /(statement|declaration|expression)$/i,
            i, l, entry, j, jl,
            type, decl, match,
            statType;

        for (i = 0, l = body.length; i < l; i++) {
            entry = body[i];
            type = entry.type;

            // first var/func/class declaration
            if (!stats.firstIdentifier) {
                if (type == "VariableDeclaration") {
                    for (j = 0, jl = entry.declarations.length; j < jl; j++) {
                        decl = entry.declarations[j];
                        if (decl.id && decl.id.type == "Identifier") {
                            stats.firstIdentifier = decl.id.name;
                            stats.firstIdType = "variable";
                            break;
                        }
                    }
                }
                else if (type == "FunctionDeclaration" || 
                        type == "ClassDeclaration") {
                    if (entry.id && entry.id.type == "Identifier") {
                        stats.firstIdentifier = entry.id.name;
                        stats.firstIdType = type.replace("Declaraion").toLowerCase();
                    }
                }
            }

            // top level wrapper func
            if (type == "ExpressionStatement" && 
                entry.expression.type == "CallExpression") {

                if (entry.expression.callee.id == null) {
                    stats.wrappedFuncCall++;
                }
                else {
                    stats.rootFuncCall++;
                }
            }

            // saving module.exports expression
            if (type == "ExpressionStatement" && 
                entry.expression.type == "AssignmentExpression" &&
                entry.expression.left.type == "MemberExpression") {

                var lnames = self._getNames(entry.expression.left),
                    rnames = [];

                if (entry.expression.right && 
                    (entry.expression.right.type == "Identifier" ||
                    entry.expression.right.type == "MemberExpression")) {
                    rnames = self._getNames(entry.expression.right);
                }

                if (entry.expression.left.object.name == "module" &&
                    entry.expression.left.property.name == "exports") {
                    stats['module.exports'] = true; //entry.expression.right;

                    var right = entry.expression.right;
                    if (right.type == "FunctionExpression") {
                        if (right.id === null) {
                            stats.exportsAnonymous = true;
                        }
                        else if (!stats.firstIdentifier && right.id.name) {
                            stats.firstIdentifier = right.id.name;
                        }
                    }
                    else if (rnames.length && 
                            rnames[0] == stats.firstIdentifier) {
                        stats.exportsFirstId = true;
                    }
                    // do not count this one
                    continue;
                }
                else {
                    if (!stats.firstIdentifier && lnames.length) {
                        stats.firstIdentifier = lnames[0];
                    }
                }

                if (lnames.length && lnames[0] == stats.firstIdentifier) {
                    stats.firstIdExpression++;
                }
            }

            // variable declarations can have multiple per entry
            if (type == "VariableDeclaration") {
                stats.declarations += entry.declarations.length;
                stats.total++;
            }
            // others have one
            else {
                match = type.match(typeReg);

                if (match) {
                    statType = match[0].toLowerCase() + "s";
                    stats[statType]++;
                    stats.total++;
                }
            }
        }

        return stats;
    },

    /**
     * Get a list of module dependencies
     * @method
     * @param {string} content
     * @returns {array} {
     *  @type {string} type 'require' | 'import'
     *  @type {array} names 
     *  @type {string} module Module name or file path
     *  @type {string} sub <code>require("a").b.c</code> would be <code>.b.c</code>
     *  @type {array} range [start, end] index positions
     * }
     */
    getFileReqs: function(content) {

        var data = esprima.parseModule(content, {range: true}),
            reqs = [];

        var add = function(name, mod, subprop, range) {
            reqs.push({
                type: "require",
                names: name ? [name] : [],
                module: mod,
                sub: subprop,
                range: range
            });
        };

        var isMemberExpressionOfRequire = function(obj) {
            if (obj.object && obj.object.type == "CallExpression" &&
                obj.object.callee.name == "require") {
                return {
                    mod: obj.object.arguments[0].value,
                    subNames: [obj.property.name]
                };
            }
            if (obj.object && obj.object.type == "MemberExpression") {
                var res = isMemberExpressionOfRequire(obj.object);
                if (res !== false) {
                    res.subNames.unshift(obj.property.name)
                    return res;
                }
            }
            return false;
        };

        data.body.forEach(function(entry){
            if (entry.type == "VariableDeclaration") {
                entry.declarations.forEach(function(decl){
                    if (!decl.id || decl.id.type != "Identifier") {
                        return;
                    }
                    if (decl.init && decl.init.type == "CallExpression" &&
                        decl.init.callee.name == "require") {
                        add(decl.id.name, decl.init.arguments[0].value, null, decl.range);
                    }
                    var res;
                    if (decl.init && decl.init.type == "MemberExpression" && 
                        (res = isMemberExpressionOfRequire(decl.init)) !== false) {
                        add(decl.id.name, res.mod, "." + res.subNames.join("."), decl.range);
                    }
                });
            }

            if (entry.type == "ExpressionStatement" && 
                entry.expression.type == "CallExpression" &&
                entry.expression.callee.name == "require") {
                add(null, entry.expression.arguments[0].value, null, entry.range);
            }
        });

        return reqs;
    },

    /**
     * Does this file needs a var name in global space
     * @method
     * @returns {bool}
     */
    hasAliases: function() {
        var file = this.host,
            as = file.getOption("as");
        return as && as.length > 0;
    },



    /**
     * Does this module needs wrapping
     * @method
     * @param {object} codeInfo
     * @param {File} file
     * @returns {bool}
     */
    needsWrapping: function(file) {

        var codeInfo = file.getCodeInfo();

        //console.log(file.path)
        //console.log(JSON.stringify(codeInfo))

        // more than one declaration (class/var/func)
        if (codeInfo.declarations > 1) {
            return true;
        }
        // at least one top-level statement for/while/if/etc
        if (codeInfo.expressions > 0) {
            return true;
        }
        // at least one expression except wrapped func calls
        // and module exports
        if (codeInfo.statements - codeInfo.wrappedFuncCall - 
            codeInfo.rootFuncCall - codeInfo.firstIdExpression -
            (codeInfo['module.exports'] ? 1 : 0) > 0) {
            return true;
        }

        // if there is only one declaration and it is being exported
        // then this module doesn't need wrapping.
        if (codeInfo.declarations === 1) {
            if (codeInfo['module.exports']) {
                if (codeInfo['module.exports'].type == "Identifier") {
                    return codeInfo['module.exports'].name != codeInfo.firstIdentifier;
                }
            }
            // otherwise, it does need wrapping
            //return true;
        }

        return false;
    },

    whatToDoWithEs5Export: function(file) {
        var info = file.getCodeInfo(),
            as = file.getOption("as");
            
        if (file.needsWrapping()) {
            return {return: true};
        }
        else {
            if (as) {
                if (file.getUniqueName() == info.firstIdentifier) {
                    return null;
                }
                else {
                    return {varName: file.getUniqueName()};
                }
            }
            else if (info.exportsFirstId) {
                return {removeAll: true};
            }
            else if (info.exportsAnonymous) {
                return {varName: file.getUniqueName()};
            }
            /*else if (!info.firstIdentifier) {
                return {varName: file.getUniqueName()};
            }*/
            /*else if (info.exportsAnonymous || !info.firstIdentifier) {
                return {varName: file.getUniqueName()};
            }*/
        }
        return null;
    },



    _getNames: function(left) {
        var getObjName = function(obj) {
                if (obj.name) {
                    return [obj.name];
                }

                if (obj.object && obj.property) {
                    var prop = obj.property,
                        names = getObjName(obj.object),
                        name;

                    if ((prop.type != "Identifier" && prop.type != "Literal") || 
                        !names.length) {
                        return [];
                    }

                    name = names[names.length-1];
                    names.push(name + "." + (prop.name || prop.value));

                    return names;
                }

                return [];
            };

        if (left.type == "Identifier") {
            return [left.name];
        }
        else if (left.type == "MemberExpression") {
            return getObjName(left).reverse();
        }
    }
});