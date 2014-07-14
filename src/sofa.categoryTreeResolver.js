'use strict';
/* global sofa */
/**
 * @name CategoryTreeResolver
 * @namespace sofa.CategoryTreeResolver
 *
 * @description
 * `CategoryTreeResolver` is used within the`CouchServic` to resolve the tree of categories.
 * It can easily be overwritten to swap out the resolve strategy.
 */
sofa.define('sofa.CategoryTreeResolver', function ($http, $q, configService) {
    var CATEGORY_JSON = configService.get('categoryJson');

    return function () {
        return $http({
            method: 'get',
            url: CATEGORY_JSON
        });
    };
});
