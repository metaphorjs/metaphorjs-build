
require("metaphorjs/src/func/dom/getAttrSet.js");
require("metaphorjs/src/lib/Text.js");
require("metaphorjs/src/lib/Expression.js");
require("metaphorjs/src/lib/Config.js");
require("metaphorjs/src/app/Directive.js");
require("metaphorjs/src/func/app/prebuilt.js");

var Base = require("../../Base.js"),
    minify = require('html-minifier').minify,
    toArray = require("metaphorjs-shared/src/func/toArray.js"),
    nextUid = require("metaphorjs-shared/src/func/nextUid.js"),
    isPlainObject = require("metaphorjs-shared/src/func/isPlainObject.js"),
    jsdom = require("jsdom"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
    getFileList = require("../../func/getFileList.js"),
    resolvePath = require("../../func/resolvePath.js");


var clearPipes = function(struct) {
    var i, l;
    if (struct.pipes) {
        for (i = 0, l = struct.pipes.length; i < l; i++) {
            delete struct.pipes[i].fn;
        }
    }
    if (struct.inputPipes) {
        for (i = 0, l = struct.inputPipes.length; i < l; i++) {
            delete struct.inputPipes[i].fn;
        }
    }
    return struct;
};


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

var directivesIncluded = false;
var filtersIncluded = false;

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

var includeFilters = function(builder) {
    var cfg = builder.config.getBuildConfig(builder.buildName) || {},
        pb = cfg.prebuild || {},
        filters = pb.filters || [];

    filters.forEach(function(path){
        getFileList(resolvePath(path, [builder.config.base]), "js")
            .forEach(function(jsFile){
                require(jsFile);
            });
    });

    filtersIncluded = true;
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

        host.builder._prebuilt = host.builder._prebuilt || {};
        MetaphorJs.app.prebuilt.setStorage(host.builder._prebuilt);

        host.$$observable.createEvent("prepare", "pipe");

        if (host.builder.config.getBuildConfig(host.builder.buildName).prebuild) {
            host.on("prepare", self.extractConfigs, self);
            //host.on("prepare", self.extractOptions, self);
            host.on("prepare", self.extractTexts, self);
        }

        host.on("prepare", self.minify, self);
    },

    _removeDirective: function(html, dom, node, attr, exprId) {
        var self = this,
            loc = dom.nodeLocation(node),
            name, attrLoc, l, start, end, q,
            idl = exprId.length;

        //console.log("remove directive", attr)
        //console.log(loc.attrs)

        for (name in loc.attrs) {
            if (name === attr) {

                attrLoc = loc.attrs[name];
                start = attrLoc.startOffset;
                end = attrLoc.endOffset;

                start += self._domShift;
                end += self._domShift;

                //console.log("name: ", name, exprId)
                // JSDOM bugfix
                var fix;
                if (name[0] === '[' && 
                    (fix = html.substring(start).indexOf(name)) !== 0) {
                    start += fix;
                    end += fix;
                    //console.log("full2: ", html.substring(start, end))
                }

                start += name.length;
                start += 1; // = sign

                q = html.substring(start, start+1);

                if (q === '"' || q === '"') {
                    start += 1;
                    end -= 1;
                }

                //console.log("value: ", html.substring(start, end))

                l = end - start;

                html = html.substring(0, start) +
                        exprId + 
                        html.substring(end);

                self._domShift += (idl - l);
            }
        }

        return html;
    },


    /*extractOptions: function(html) {
        if (html.substr(0,5) === '<!--{') {
            var inx = html.indexOf('-->');
            return html.substring(inx + 3);
        }
        return html;
    },*/



    extractTexts: function(html) {

        var self = this;

        !filtersIncluded && includeFilters(this.host.builder);

        if (MetaphorJs.lib.Text.applicable(html)) {
            html = MetaphorJs.lib.Text.eachText(html, function(expression) {
                var struct = MetaphorJs.lib.Expression.deconstruct(
                    expression
                );
                var id = MetaphorJs.app.prebuilt.add(
                    "config", 
                    clearPipes(struct)
                );
                return '{{' + id + '}}';
            });
        }

        return html;
    },

    extractConfigs: function(html) {

        !directivesIncluded && includeDirectives(this.host.builder);
        !filtersIncluded && includeFilters(this.host.builder);

        var dom = new jsdom.JSDOM(html, { 
                includeNodeLocations: true 
            }),
            self = this,
            body = dom.window.document.body,
            cfgs = {},
            dir, key, expr, 
            dirs, i, l, dirCfg,
            dirFn;

        walkDom(body, function(node) {
            var nodeType = node.nodeType,
                id,
                config;

            if (nodeType === dom.window.document.ELEMENT_NODE) {

                var attrSet = MetaphorJs.dom.getAttrSet(node);

                //console.log(attrSet.directives)

                if (attrSet.directives) {
                    for (dir in attrSet.directives) {

                        dirFn = MetaphorJs.directive.attr[dir] ||
                                MetaphorJs.directive.tag[dir];

                        dirs = attrSet.directives[dir];

                        if (!dirFn) {
                            console.log("Directive not found: ", dir);
                            continue;
                        }

                        for (i = 0, l = dirs.length; i < l; i++) {

                            dirCfg = dirs[i];
                            config = new MetaphorJs.lib.Config(dirCfg, {
                                scope: {}
                            });

                            MetaphorJs.app.Directive.initConfig(config);
                            dirFn.initConfig && dirFn.initConfig(config);
                            dirFn.deepInitConfig && dirFn.deepInitConfig(config);

                            config.eachProperty(function(key) {
                                var prop = config.getProperty(key),
                                    mode = prop.mode || prop.defaultMode,
                                    expr = prop.expression,
                                    descr;

                                if (!expr || expr === true ||
                                    mode === MetaphorJs.lib.Config.MODE_STATIC) {
                                    return;
                                }

                                id = MetaphorJs.app.prebuilt.add(
                                    "config", 
                                    clearPipes(config.storeAsCode(key))
                                );

                                html = self._removeDirective(
                                    html, dom, node,
                                    dirCfg[key].attr, id
                                );
                            });
                        }
                    }
                }

                if (attrSet.attributes) {

                    for (key in attrSet.attributes) {

                        expr = attrSet.attributes[key];

                        if (!MetaphorJs.lib.Text.applicable(expr)) {
                            id = MetaphorJs.app.prebuilt.add(
                                "config", 
                                clearPipes(
                                    MetaphorJs.lib.Expression.deconstruct(
                                        expr
                                    )
                                )
                            );

                            html = self._removeDirective(
                                html, dom, node,
                                attrSet.__attributes[key], id
                            );
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