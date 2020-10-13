
const   cls = require("metaphorjs-class/src/cls.js"),
        MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
        extend = require("metaphorjs-shared/src/func/extend.js");

const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const ClosurePlugin = require('closure-webpack-plugin');
const obj2code = require("./func/obj2code.js");
const Dotenv = require("dotenv-webpack");


module.exports = cls({
    $class: "MetaphorJs.build.Webpack",

    $init: function(options) {
        this.options = options;
    },

    createIndex: function() {

        const files = this.options.files,
              config = this.options.config,
              time = (new Date).getTime(),
              tmp = `/tmp/wp-${time}.js`,
              pblt = `/tmp/wp-prebuilt-${time}.js`,
              mjsPath = require.resolve("metaphorjs-shared/src/MetaphorJs.js");

        let prebuilt = `const MetaphorJs = require("${mjsPath}");` + "\n";
        prebuilt +=     "MetaphorJs.prebuilt = " + 
                            obj2code(MetaphorJs.app.prebuilt.getStorage()) + "\n";

        let content = "";
        content += `const MetaphorJs = require("${mjsPath}");` + "\n";
        content += `require("${pblt}");` + "\n";
        files.forEach(f => {
            content += `require("${f}");` + "\n";
        });

        if (config.export) {
            content += `module.exports = ${config.export};`;
        }

        this.indexName = tmp;
        this.pbltName = pblt;
        this.pbltContent = prebuilt;
        return this.indexContent = content;
    },

    createConfig: function() {
        
        const config = this.options.config;
        const package = this.options.package;
        const exclude = this.options.exclude;
        let wpConfig;

        if (config.webpackConfig) {
            wpConfig = require(config.webpackConfig);
        }
        else {
            wpConfig = {};
        }

        extend(wpConfig, { 
            plugins: [], 
            module: { rules: [] },
            externals: {}
        }, false, true);

        wpConfig.plugins.push(
            new Dotenv({
                path: "./.env.local"
            })
        )

        wpConfig.module.rules.push({
            test: function(resource) {
                return exclude.indexOf(resource) !== -1;
            },
            use: "metaphorjs-build/node_modules/null-loader"
        })

        wpConfig.mode = wpConfig.mode || "production";
        wpConfig.entry = this.indexName;
        wpConfig.output = wpConfig.output || {};

        if (!wpConfig.output.path || !wpConfig.output.filename) {
            let target = config.target;
            if (target[0] !== "/" && target[0] !== ".") {
                if (target.indexOf("/") !== -1) {
                    target = target.split("/");
                    wpConfig.output.filename = target.pop();
                    wpConfig.output.path = path.resolve("./" + target.join("/"));
                }
                else {
                    wpConfig.output.path = path.resolve("./");
                    wpConfig.output.filename = target;
                }
            }
        }

        if (!wpConfig.output.library) {
            let library = config.library || (package ? package.name : null);
            if (library) {
                wpConfig.output.library = library;
            }
        }

        wpConfig.output.libraryTarget = wpConfig.output.libraryTarget || "umd";

        if (config.optimize !== false) {
            if (!wpConfig.optimization) {

                if (config.useCC === true) {
                    const minimizer = [];
                    minimizer.push(new ClosurePlugin({mode: 'AGGRESSIVE_BUNDLE'}))
                    wpConfig.optimization = {
                        concatenateModules: false,
                        minimizer: minimizer
                    };
                }
                else {
                    wpConfig.optimization = {
                        concatenateModules: true
                    };
                }
            }
        }
        else {
            wpConfig.optimization = {
                minimize: false
            };
        }

        if (config.externals) {
            extend(wpConfig.externals, config.externals);
        }

        this.wpConfig = wpConfig;
    },

    run: async function() {

        const { indexName, indexContent, wpConfig,
                pbltName, pbltContent } = this;

        fs.writeFileSync(indexName, indexContent);
        fs.writeFileSync(pbltName, pbltContent);

        //console.log(wpConfig)

        try {
            await new Promise((rs, rj) => {
                webpack(wpConfig, (err, stats) => {

                    const info = stats.toJson();
                    if (stats.hasWarnings()) {
                        //console.warn(info.warnings);
                    }

                    if (err) {
                        rj(err);
                    }
                    else if (stats.hasErrors()) {
                        rj(info.errors);
                    }
                    else {
                        rs();
                    }
                });
            });
        }
        catch (err) {
            console.log(err)
        }

        //fs.unlinkSync(indexName);
        //fs.unlinkSync(pbltName);
    }
});