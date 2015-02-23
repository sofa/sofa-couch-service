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
        if (!map[category.id]) {
            map[category.id] = category;
        }
    };

    /**
     * @sofadoc method
     * @name sofa.helper.CategoryMap#getCategory
     * @memberof sofa.CategoryMap
     *
     * @description
     * Returns a category by a given `id` from the map.
     *
     * @param {int} id of the Category.
     *
     * @return {object} Category object.
     */
    self.getCategory = function (id) {
        return map[id];
    };

    return self;

});
