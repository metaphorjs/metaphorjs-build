
var isFile = require("../../../metaphorjs/src/func/fs/isFile.js");

module.exports = function() {

    var l = arguments.length,
        i,
        path,
        inx;

    for (i = 0; i < l; i++) {
        path = arguments[i];
        if ((inx = path.indexOf('*')) != -1) {
            path = path.substr(0, inx);
            path = path.split('/');
            path.pop();
            path = path.join("/");
        }
        if (isFile(path)) {
            return arguments[i];
        }
    }

    return arguments[0];
};