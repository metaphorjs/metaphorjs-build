
require("metaphorjs/src/func/dom/getAttrSet.js");
require("metaphorjs/src/lib/Text.js");
require("metaphorjs/src/lib/Expression.js");

var Base = require("../../Base.js"),
    minify = require('html-minifier').minify,
    toArray = require("metaphorjs-shared/src/func/toArray.js"),
    nextUid = require("metaphorjs-shared/src/func/nextUid.js"),
    isPlainObject = require("metaphorjs-shared/src/func/isPlainObject.js"),
    jsdom = require("jsdom"),
    extend = require("metaphorjs-shared/src/func/extend.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
    getFileList = require("../../func/getFileList.js"),
    resolvePath = require("../../func/resolvePath.js");



var walkDom = function(node, fn) {

    fn(node);

    if (node.childNodes) {
        var nodes = toArray(node.childNodes);
        nodes.forEach(function(n){
            walkDom(n, fn);
        });
    }
};

var deflate = function(obj) {

    var k, v, cnt = 0, sub;

    for (k in obj) {
        if (obj.hasOwnProperty(k)) {
            cnt++;   
            v = obj[k];
            if (isPlainObject(v)) {
                sub = deflate(v);
                if (sub[0] === 0) {
                    delete obj[k];
                    cnt--;
                }
            }
            else if (v === null) {
                delete obj[k];
                cnt--;
            }
        }
    }

    if (cnt < 0) {
        cnt = 0;
    }

    return [cnt, obj];
};

var isEmptyObject = function(obj) {
    var k;
    for (k in obj) {
        if (obj.hasOwnProperty(k)) {
            return false;
        }
    }
    return true;
};

var directivesIncluded = false;

var includeDirectives = function(builder) {

    var cfg = builder.config.getBuildConfig(builder.buildName) || {},
        pb = cfg.prebuild || {},
        dirs = pb.directives || [];

    if (!global.window) {
        global.window = {
            document: {
                body: {},
                documentElement: {},
                createElement: function() {
                    return {};
                }
            }
        };
    }

    dirs.forEach(function(path){
        getFileList(resolvePath(path, [builder.config.base]), "js")
            .forEach(function(jsFile){
                require(jsFile);
            });
    });

    directivesIncluded = true;
};

var processExpression = function(expr, builder, dir, dirFn, attrSet) {

    var exprs = builder._prebuilt.expressions,
        map = builder._prebuilt.exprMap,
        funcs = builder._prebuilt.expressionFuncs,
        opts = builder._prebuilt.expressionOpts,
        id, o, noReturn;

    if (expr && typeof expr === "string") {
        expr = expr.replace(/[\n\r]/g, '');
        expr = expr.replace(/\s+/g, ' ');
    }

    if (expr && 
        typeof expr === "string" &&
        !MetaphorJs.lib.Expression.expressionHasPipes(expr) &&
        !MetaphorJs.lib.Expression.isStatic(expr) &&
        expr.indexOf('this.') !== -1 &&
        !(dirFn && dirFn.$prebuild && dirFn.$prebuild.skip)) {

        noReturn = false;

        if ((dir && attrSet.directive[dir].dtype === "event") || 
            (dirFn && dirFn.$prebuild && dirFn.$prebuild.noReturn)) {
            noReturn = true;
        }

        if (!map[expr]) {
            id = nextUid();

            o = MetaphorJs.lib.Expression.describeExpression(expr);
            o && (opts[id] = o);

            exprs[id] = expr;
            map[expr] = id;
            funcs[id] = MetaphorJs.lib.Expression.expression(expr, {
                asCode: true,
                noReturn: noReturn
            });
            return "--" + id;
        }
        else {
            return "--" + map[expr];
        }
    }

    return expr;
};

module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.template.Processor",
    host: null,
    _domShift: 0,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this,
            host = self.host;

        host._prebuilt = {
            configs: {}
        };

        host.builder._prebuilt = host.builder._prebuilt || {};
        extend(host.builder._prebuilt, {
            expressions: {},
            expressionFuncs: {},
            expressionOpts: {},
            exprMap: {}
        }, false, false);

        host.$$observable.createEvent("prepare", "pipe");

        if (host.builder.config.prebuild) {
            host.on("prepare", self.extractConfigs, self);
            host.on("prepare", self.extractOptions, self);
            host.on("prepare", self.extractTexts, self);
        }

        host.on("prepare", self.minify, self);
    },

    _removeDirective: function(html, dom, node, attr, exprId) {
        var self = this,
            loc = dom.nodeLocation(node),
            name, attrLoc, l, start, end, q,
            idl = exprId.length;

        for (name in loc.attrs) {
            if (name === attr) {

                attrLoc = loc.attrs[name];
                start = attrLoc.startOffset;
                end = attrLoc.endOffset;
                start += self._domShift;
                end += self._domShift;

                console.log(html.substring(start, end));

                start += name.length;
                start += 1; // = sign

                q = html.substring(start, start+1);
                if (q === '"' || q === '"') {
                    start += 1;
                    end -= 1;
                }

                console.log(html.substring(start, end))

                l = end - start;

                html = html.substring(0, start) +
                        exprId + 
                        html.substring(end);

                self._domShift += (idl - l);
            }
        }

        return html;
    },


    extractOptions: function(html) {
        if (html.substr(0,5) === '<!--{') {
            var inx = html.indexOf('-->');
            return html.substring(inx + 3);
        }
        return html;
    },


    extractTexts: function(html) {

        var self = this;

        if (MetaphorJs.lib.Text.applicable(html)) {
            html = MetaphorJs.lib.Text.eachText(html, function(expression) {
                expression = processExpression(expression.trim(), self.host.builder);
                return '{{' + expression + '}}';
            });
        }

        return html;
    },

    extractConfigs: function(html) {

        if (!directivesIncluded) {
            includeDirectives(this.host.builder);
        }

        var dom = new jsdom.JSDOM(html, { 
                includeNodeLocations: true 
            }),
            self = this,
            body = dom.window.document.body,
            cfgs = {},
            dir, key, expr, 
            dirFn;

        walkDom(body, function(node) {
            var nodeType = node.nodeType,
                id;

            if (nodeType === 1) {

                var attrSet = MetaphorJs.dom.getAttrSet(node);

                if (attrSet.directive) {
                    for (dir in attrSet.directive) {

                        dirFn = MetaphorJs.directive.attr[dir] ||
                                MetaphorJs.directive.tag[dir];

                        for (key in attrSet.directive[dir].config) {
                            expr = attrSet.directive[dir].config[key].expression;
                            attrSet.directive[dir].config[key].expression = 
                                processExpression(
                                    expr, self.host.builder, dir, dirFn, attrSet
                                );

                            if (MetaphorJs.lib.Expression.isPrebuiltKey(
                                attrSet.directive[dir].config[key].expression)) {
    
                                html = self._removeDirective(
                                    html, dom, node,
                                    attrSet.directive[dir].config[key].original,
                                    attrSet.directive[dir].config[key].expression
                                );
                            }
                        }
                    }
                }

                id = nextUid();
                cfgs[id] = attrSet;

            }
        });

        return html;
    },

    minify: function(html) {
        html = minify(html, {
            collapseWhitespace: true,
            collapseInlineTagWhitespace: true
        });
        return html;
    }
});