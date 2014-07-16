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
    return function (product) {

        // the backend is sending us prices as strings.
        // we need to fix that up for sorting and other things to work
        product.price = parseFloat(product.price, 10);

        return product;
    };
});
