#!/usr/bin/env node

var args = require("minimist")(process.argv.slice(2), {
    boolean: true
});

var build;

if (process.env['METAPHORJS_DEV'] || args.dev) {
    require("../../metaphorjs/dev/env.js");
    build = require("../src/func/build.js");
    
}
else {
    build = require("./../dist/metaphorjs.build.js").build;
}

build(args._[0]);