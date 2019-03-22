

var isPlainObject = require("metaphorjs-shared/src/func/isPlainObject.js"),
    isArray = require("metaphorjs-shared/src/func/isArray.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

module.exports = (function() {

    var funcs = {},
        id = 0,
        fnmap = {};


    var procobj = function(obj) {
        if (typeof obj === "function") {
            var idk = "---" + (id++) + "---";
            funcs[idk] = unspace(obj.toString());
            return idk;
        }
        else if (isPlainObject(obj)) {
            walkobj(obj);
        }
        else if (isArray(obj)) {
            walkobj(obj);
        }  
        return obj;
    };

    var walkobj = function(obj) {
        var k, i ,l;
        if (isPlainObject(obj)) {
            for (k in obj) {
                obj[k] = procobj(obj[k]);
            }
        }
        else if (isArray(obj)) {
            for (i = 0, l = obj.length; i < l; i++) {
                obj[i] = procobj(obj[i]);
            }
        }  
    };
     
    var unspace = function(fn) {
        fn = fn.replace(/[\n\r]/g, '');
        fn = fn.replace(/\s+/g, ' ');
        fn = fn.replace(' anonymous', '');
        return fn;
    };

    var obj2code = function obj2code(obj) {

        if (typeof obj === "string") {
            return unspace(obj);
        }
        else if (typeof obj === "function") {
            return unspace(obj.toString());
        }
        else {
            walkobj(obj);
            obj = JSON.stringify(obj);

            for (var idk in funcs) {
                obj = obj.replace('"'+idk+'"', funcs[idk]);
            }

            return obj;
        }
    };

    return obj2code;
}());