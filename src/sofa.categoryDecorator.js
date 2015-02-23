'use strict';
/* global sofa */
/**
 * @name CategoryDecorator
 * @namespace sofa.CategoryDecorator
 *
 * @description
 * `CategoryDecorator` is used within the`CouchService` to decorate/fix up a category
 * after it is returned from the server and before it is processed further. This action
 * takes place before the category is mapped on a `sofa.models.Category`
 */
sofa.define('sofa.CategoryDecorator', function (configService) {

    var MEDIA_FOLDER            = configService.get('mediaFolder'),
        MEDIA_IMG_EXTENSION     = configService.get('mediaImgExtension');

    return function (category) {

        category.image = MEDIA_FOLDER + category.id + '.' + MEDIA_IMG_EXTENSION;
            
        return category;
    };
});
