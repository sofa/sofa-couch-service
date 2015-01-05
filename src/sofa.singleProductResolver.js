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
                    // it's important to only call getProduct if the previous call yielded the requested product
                    // Otherwise we are running into an infinite loop where we try to fetch the product over and
                    // over without any luck.
                    return couchService.isProductCached(categoryUrlId, productUrlKey) ? couchService.getProduct(categoryUrlId, productUrlKey) : null;
                });
    };
});
