#!/usr/bin/env node

require("./builder/Builder.js")
    .build(process.argv[2], process.argv[3]);