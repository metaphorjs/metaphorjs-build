#!/usr/bin/env node

var args = require("minimist")(process.argv.slice(2), {
    boolean: true
});

if (process.env['METAPHORJS_DEV'] || args.dev) {
    require("../../metaphorjs/dev/mockery.js");
}

if (args.all) {
    require("./../dist/metaphorjs.build.js")
        .Builder
        .compileAll(args.auto || false);
}
else {

    require("./../dist/metaphorjs.build.js")
        .Builder
        .compile(args._[0], args._[1]);
}