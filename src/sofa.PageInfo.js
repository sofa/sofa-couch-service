'use strict';
/* global sofa */
/**
 * @name PageInfoFactory
 * @namespace sofa.PageInfoFactory
 *
 * @description
 * The `PageInfoFactory` is used to create `PageInfo` objects which encapsulate paging data.
 */
sofa.define('sofa.PageInfoFactory', function (configService) {
    var DEFAULT_PAGE_SIZE = configService.get('defaultPageSize', 10);

    var PageInfo = function (size, from) {
        this.size = size;
        this.from = from;
    };

    PageInfo.prototype.next = function () {
        this.from = this.from + this.size;
        return this;
    };

    var self = {};

    /**
     * @method createPageInfo
     * @memberof sofa.PageInfoFactory
     *
     * @description
     * Creates a PageInfo object from a batch of an array of entities
     *
     * @param {entities} The array of entities representing the entire set
     * @return {object} The PageInfo object
     */
    self.createPageInfo = function (entities) {
        return new PageInfo(DEFAULT_PAGE_SIZE, entities.length - DEFAULT_PAGE_SIZE);
    };

    return self;
});
