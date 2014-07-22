'use strict';
/* global sofa */
/*jshint bitwise: false*/

/**
 * @name HashService
 * @namespace sofa.HashService
 *
 * @description
 * A service that creates hashes for strings or objects. This might be refactored
 * into a self contained sofa service in the future.
 */
sofa.HashService = function () {

    var self = {};

    /**
     * @method hashString
     * @memberof sofa.HashService
     *
     * @description
     * Creates a hash for the given string
     *
     * @param {str} The string to base the hash on
     * @preturn {str} The hash
     */
    self.hashString = function (str) {
        // http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
        var hash = 0, i, chr, len;
        if (str.length === 0) {
            return hash;
        }

        for (i = 0, len = str.length; i < len; i++) {
            chr   = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }

        return hash.toString();
    };

    /**
     * @method hashObject
     * @memberof sofa.HashService
     *
     * @description
     * Creates a hash for the given object
     *
     * @param {obj} The object to base the hash on
     * @preturn {str} The hash
     */
    self.hashObject = function (obj) {
        return self.hashString(JSON.stringify(obj));
    };

    return self;
};