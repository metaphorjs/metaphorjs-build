
var fs = require("fs"),
    path = require("path"),
    isDir = require("metaphorjs/src/func/fs/isDir.js");


/**
 * Resolve path or file pattern to an asbolute path or file pattern
 * @function
 * @param {string} toResolve 
 * @param {array} locations 
 * @param {string} resolveDir 
 */
module.exports = function(toResolve, locations, resolveDir) {

    if (!toResolve) {
        return null;
    }

    locations = locations || [];

    if (process.env.METAPHORJS_PATH) {
        locations.push(process.env.METAPHORJS_PATH);
    }
    if (process.env.NODE_PATH) {
        locations = locations.concat(process.env.NODE_PATH.split(path.delimiter));
    }

    try {
        var resolved = require.resolve(toResolve, {
            paths: locations
        });
        if (resolved) {
            return resolved;
        }
    }
    catch (thrown) {}

    var norm = toResolve,
        inx,
        i, l,
        loc,
        dirMode = !!resolveDir,
        abs = norm.substr(0, 1) === "/";

    while ((inx = norm.indexOf('*')) !== -1) {
        norm = norm.substr(0, inx);
        norm = norm.split('/');
        norm.pop();
        norm = norm.join("/");
        dirMode = true;
    }

    if (abs) {
        if (fs.existsSync(norm)) {
            if (dirMode || !isDir(norm)) {
                return path.normalize(norm) + toResolve.replace(norm, "");
            }
        }
    }

    for (i = 0, l = locations.length; i < l; i++) {
        loc = locations[i];

        if (loc.substr(loc.length - 1) !== '/') {
            loc += '/';
        }

        if (fs.existsSync(loc + norm)) {
            if (dirMode || !isDir(loc + norm)) {
                return path.normalize(loc + norm) + toResolve.replace(norm, "");
            }
        }
    }

    /*try {
        return require.resolve(toResolve);
    }
    catch (thrown) {}*/

    

    return null;
};