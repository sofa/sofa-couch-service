'use strict';
/* global sofa */
/**
 * @name ProductDecorator
 * @namespace sofa.ProductDecorator
 *
 * @description
 * `ProductDecorator` is used within the`CouchService` to decorate/fix up a product
 * after it is returned from the server and before it is processed further. This action
 * takes place before the product is mapped on a `sofa.models.Product`
 */
sofa.define('sofa.ProductDecorator', function () {
    return function (product, options) {

        // This is a very important augmentation but we need to move it into the
        // decorator even if that means it's less generic than we might want it to be.
        // Our old API does not include the categoryUrlId on the product so we can only
        // set it if it's in the option which in turn limits the area of queries that
        // are possible. Therefore we moved the logic here and let different implementations
        // which have the category on the product handle smarter queries.
        product.categoryUrlId = options && options.categoryUrlId;
        // the backend is sending us prices as strings.
        // we need to fix that up for sorting and other things to work
        product.price = parseFloat(product.price, 10);

        return product;
    };
});
