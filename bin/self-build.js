#!/usr/bin/env node

var args = require("minimist")(process.argv.slice(2), {
    boolean: true
});

if (args.dev) {
    require("../../metaphorjs/dev/mockery.js");
}

if (args.all) {
    require("./../src/class/Builder.js")
        .buildAll(args.auto || false);
}
else {
    require("./../src/class/Builder.js")
        .build(args._[0], args._[1]);
}