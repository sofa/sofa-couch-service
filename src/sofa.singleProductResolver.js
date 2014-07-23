'use strict';
/* global sofa */
/**
 * @name SingleProductResolver
 * @namespace sofa.SingleProductResolver
 *
 * @description
 * `SingleProductResolver` is used within the`CouchService` 
 * to resolve a singke product for a given categoryUrlId + productUrlKey combination. 
 * It can easily be overwritten to swap out the resolve strategy.
 */
sofa.define('sofa.SingleProductResolver', function (couchService) {
    return function (categoryUrlId, productUrlKey) {
        return couchService
                .getProducts(categoryUrlId)
                .then(function () {
                    return couchService.getProduct(categoryUrlId, productUrlKey);
                });
    };
});
