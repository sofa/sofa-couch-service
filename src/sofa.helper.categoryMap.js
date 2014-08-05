'use strict';
/* global sofa */
/**
 * @sofadoc class
 * @name sofa.helper.CategoryMap
 * @namespace sofa.helper
 *
 * @package sofa-checkout-service
 * @requiresPackage sofa-core
 * @requiresPackage sofa-http-service
 * @requiresPackage sofa-q-service
 *
 * @distFile dist/sofa.CouchService.js
 *
 * @description
 * Category mapping service that sets up mappings between category urls and category
 * objects.
 */
sofa.define('sofa.util.CategoryMap', function () {


    var self = {};

    var map = {};

    /**
     * @sofadoc method
     * @name sofa.helper.CategoryMap#addCategory
     * @memberof sofa.helper.CategoryMap
     *
     * @description
     * Adds a new category to the map.
     *
     * @param {object} category A category object
     */
    self.addCategory = function (category) {
        if (!map[category.urlId]) {
            map[category.urlId] = category;
        } else {
            //if we had this category before but now have another one aliased with the same id
            //we have to look if this one has children. If it has children, than it should have
            //precedence

            if (category.children && category.children.length > 0) {
                map[category.urlId] = category;
            }
        }
    };

    /**
     * @sofadoc method
     * @name sofa.helper.CategoryMap#getCategory
     * @memberof sofa.CategoryMap
     *
     * @description
     * Returns a category by a given `urlId` from the map.
     *
     * @param {int} urlId Category url id.
     *
     * @return {object} Category object.
     */
    self.getCategory = function (urlId) {
        return map[urlId];
    };

    return self;

});
