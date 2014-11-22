
var fs = require("fs"),
    path = require("path"),
    isDir = require("metaphorjs/src/func/fs/isDir.js");

module.exports = function(toResolve, locations) {

    if (toResolve.indexOf("./") !== 0 &&
        toResolve.indexOf("../") !== 0 &&
        toResolve.indexOf("*") == -1 &&
        toResolve.indexOf("/") == -1 &&
        toResolve.indexOf(".js") != toResolve.length - 3) {
        return true;
    }

    locations = locations || [];

    if (process.env.METAPHORJS_PATH) {
        locations.push(process.env.METAPHORJS_PATH);
    }
    if (process.env.NODE_PATH) {
        locations = locations.concat(process.env.NODE_PATH.split(path.delimiter));
    }

    var norm = toResolve,
        inx,
        i, l,
        loc,
        dirMode = false;

    while ((inx = norm.indexOf('*')) != -1) {
        norm = norm.substr(0, inx);
        norm = norm.split('/');
        norm.pop();
        norm = norm.join("/");
        dirMode = true;
    }

    for (i = 0, l = locations.length; i < l; i++) {
        loc = locations[i];

        if (loc.substr(loc.length - 1) != '/') {
            loc += '/';
        }

        if (fs.existsSync(loc + norm)) {
            if (dirMode || !isDir(loc + norm)) {
                return path.normalize(loc + norm) + toResolve.replace(norm, "");
            }
        }
    }

    try {
        var resolved = require.resolve(toResolve);
        if (resolved == toResolve) {
            return true;
        }
        return resolved;
    }
    catch (thrown) {}

    return false;
};