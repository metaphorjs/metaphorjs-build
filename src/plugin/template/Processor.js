
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
            exprMap: {}
        }, false, false);

        host.$$observable.createEvent("prepare", "pipe");
        host.on("prepare", self.extractConfigs, self);
        host.on("prepare", self.extractOptions, self);
        host.on("prepare", self.extractTexts, self);
        host.on("prepare", self.minify, self);
    },

    _removeDirectives: function(html, dom, node, id) {

        var name, fc, l, start, end,
            self = this,
            loc = dom.nodeLocation(node),
            firstStart = null,
            idTag = " mjs=" + id,
            idtl = idTag.length,
            spacel = 0;

        for (name in loc.attrs) {
            fc = name.substr(0,1);
            if (fc === '{' || fc === '(' || fc === '[' ||
                fc === '#' ||
                name.substr(0,4) === 'mjs-') {
                start = loc.attrs[name].startOffset + self._domShift;
                end = loc.attrs[name].endOffset + self._domShift;
                l = end - start;
                firstStart === null && (firstStart = start);
                spacel += l;

                html = html.substring(0, start) +
                        (new Array(l + 1)).join(" ") + 
                        html.substring(end);
            }
        }

        if (firstStart !== null) {
            // if length of removed attributes is bigger than
            // of the id tag
            if (spacel >= idtl) {
                html = html.substring(0, firstStart) + 
                        idTag +
                        html.substring(firstStart + idtl);
            }
            // otherwise, we add idtl to domShift (position shift)
            else {
                html = html.substring(0, firstStart) + 
                        idTag +
                        html.substring(firstStart);
                self._domShift += idtl;
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

        var exprs = this.host.builder._prebuilt.expressions,
            map = this.host.builder._prebuilt.exprMap,
            funcs = this.host.builder._prebuilt.expressionFuncs,
            id;

        if (MetaphorJs.lib.Text.applicable(html)) {
            html = MetaphorJs.lib.Text.eachText(html, function(expression) {
                expression = expression.trim();
                if (expression && 
                    !MetaphorJs.lib.Expression.expressionHasPipes(expression) &&
                    !MetaphorJs.lib.Expression.isStatic(expression) &&
                    expression.indexOf('this.') !== -1) {
        
                    if (!map[expression]) {
                        id = nextUid();
                        exprs[id] = expression;
                        map[expression] = id;
                        funcs[id] = MetaphorJs.lib.Expression.expression(expression, {
                            asCode: true
                        });
                    }
                    else {
                        id = map[expression];
                    }
                    return '{{--' + id + '}}';
                }
                return '{{'+expression+'}}';
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
            exprs = self.host.builder._prebuilt.expressions,
            map = self.host.builder._prebuilt.exprMap,
            funcs = self.host.builder._prebuilt.expressionFuncs,
            dirFn;

        walkDom(body, function(node){
            var nodeType = node.nodeType;

            if (nodeType === 1) {

                var attrSet = MetaphorJs.dom.getAttrSet(node);
                delete attrSet.removeDirective;
                delete attrSet.rest;
                delete attrSet.names;

                deflate(attrSet);
                if (isEmptyObject(attrSet)) {
                    return;
                }

                if (attrSet.directive) {
                    for (dir in attrSet.directive) {
                        delete attrSet.directive[dir].original;
                        dirFn = MetaphorJs.directive.attr[dir] ||
                                MetaphorJs.directive.tag[dir];
                        for (key in attrSet.directive[dir].config) {
                            expr = attrSet.directive[dir].config[key].expression;
                            if (expr && 
                                !MetaphorJs.lib.Expression.expressionHasPipes(expr) &&
                                !MetaphorJs.lib.Expression.isStatic(expr) &&
                                expr.indexOf('this.') !== -1 &&
                                !(dirFn && dirFn.$prebuild && dirFn.$prebuild.skip)) {

                                expr = expr.replace(/[\n\r]/g, '');
                                expr = expr.replace(/\s+/g, ' ');
                                //attrSet.directive[dir].config[key].expression = expr;

                                if (!map[expr]) {
                                    id = nextUid();
                                    exprs[id] = expr;
                                    map[expr] = id;
                                    funcs[id] = MetaphorJs.lib.Expression.expression(expr, {
                                        asCode: true
                                    });
                                    attrSet.directive[dir].config[key].expression = "--"+id;
                                }
                                else {
                                    attrSet.directive[dir].config[key].expression = "--"+map[expr];
                                }
                            }
                        }
                    }
                }


                var id = nextUid();
                cfgs[id] = attrSet;

                html = self._removeDirectives(html, dom, node, id);
            }
        });

        self.host._prebuilt.configs = cfgs;

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