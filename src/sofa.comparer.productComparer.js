'use strict';
/* global sofa */
/**
 * @sofadoc class
 * @name sofa.comparer.ProductComparer
 * @namespace sofa.comparer
 *
 * @package sofa-couch-service
 * @requiresPackage sofa-core
 * @requiresPackage sofa-http-service
 *
 * @distFile dist/sofa.checkoutService.js
 *
 * @description
 *
 */
sofa.define('sofa.comparer.ProductComparer', function () {
    return function (a, b) {

        //either compare products by object identity, urlKey identity or id identity
        return  a === b ||
                a.urlKey && b.urlKey && a.urlKey === b.urlKey ||
                a.id && b.id && a.id === b.id;
    };
});
