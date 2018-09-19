#!/usr/bin/env node

var args = require("minimist")(process.argv.slice(2), {
    boolean: true
});

var compile;

if (process.env['METAPHORJS_DEV'] || args.dev) {
    require("../../metaphorjs/dev/mockery.js");
    compile = require("../src/func/compile.js");
    
}
else {
    compile = require("./../dist/metaphorjs.build.js").compile;
}

compile(args._[0]);
process.exit(code);