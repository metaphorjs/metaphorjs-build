#!/usr/bin/env node

var script = process.argv[2];
process.argv.splice(2, 1);
require("./" + script + ".js");