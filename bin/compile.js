#!/usr/bin/env node

var args = require("minimist")(process.argv.slice(2), {
    boolean: true
});

if (process.env['METAPHORJS_DEV'] || args.dev) {
    require("../../metaphorjs/dev/mockery.js");
}

if (args.all) {
    require("./builder/Builder.js").compileAll();
}
else {
    require("./builder/Builder.js")
        .compile(process.argv[2], process.argv[3]);
}