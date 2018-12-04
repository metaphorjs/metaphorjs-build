
module.exports = function removeDebug(str) {
    var start, end,
        endl = "/*DEBUG-END*/".length;
    while ((start = str.indexOf('/*DEBUG-START*/')) !== -1 &&
            (end = str.indexOf('/*DEBUG-END*/', start)) !== -1) {
        str = str.substring(0, start) + str.substring(end + endl);
    }
    return str;
}