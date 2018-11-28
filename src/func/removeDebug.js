
module.exports = function removeDebug(str) {
    var start, end;
    while ((start = str.indexOf('/*DEBUG-START*/')) &&
            (end = str.indexOf('/*DEBUG-END*/'))) {
        str = str.substring(0, start) + str.substring(end);
    }
    return str;
}