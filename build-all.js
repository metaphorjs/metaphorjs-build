#!/usr/bin/env node

require("./builder/Builder.js")
    .buildAll(process.argv[2]);