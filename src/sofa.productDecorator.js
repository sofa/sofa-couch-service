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
sofa.ProductDecorator = function () {
    return function (product) {
        product = product._source;

        //FIXME
        product.attributes = {};

        return product;
    };
};
