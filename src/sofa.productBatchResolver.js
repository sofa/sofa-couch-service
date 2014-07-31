'use strict';
/* global sofa */
/**
 * @name ProductBatchResolver
 * @namespace sofa.ProductBatchResolver
 *
 * @description
 * `ProductBatchResolver` is used within the`CouchService` to resolve a batch of products
 * for a given categoryUrlId. It can easily be overwritten to swap out the resolve strategy.
 */
sofa.define('sofa.ProductBatchResolver', function ($http, $q, configService) {
    var API_URL             = configService.get('apiUrl'),
        //this is not exposed to the SAAS hosted product, hence the default value
        API_HTTP_METHOD     = configService.get('apiHttpMethod', 'jsonp'),
        STORE_CODE          = configService.get('storeCode');

    return function (options) {
        return $http({
            method: API_HTTP_METHOD,
            url: API_URL +
            '?&stid=' +
            STORE_CODE +
            '&cat=' + options.categoryUrlId +
            '&callback=JSON_CALLBACK'
        })
        .then(function (data) {
            return data.data.products;
        });
    };
});
