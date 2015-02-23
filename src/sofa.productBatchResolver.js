'use strict';
/* global sofa */
/**
 * @name ProductBatchResolver
 * @namespace sofa.ProductBatchResolver
 *
 * @description
 * `ProductBatchResolver` is used within the`CouchService` to resolve a batch of products
 * for a given categoryId. It can easily be overwritten to swap out the resolve strategy.
 */
sofa.ProductBatchResolver = function ($http, $q, configService) {

    var DEFAULT_CONFIG = {};

    return function (options) {
        var config = options.config || DEFAULT_CONFIG;
        var prettyPrint = configService.get('loggingEnabled') ? '?pretty=true' : '';
        var url = configService.get('esEndpoint') + 'product/_search' + prettyPrint;

        var queryOptions = {};

        if (options.productIds) {
            var should = options.productIds.map(function (id) {
                return {
                    term: { id: id }
                };
            });

            queryOptions = {
                'query' : {
                    'filtered' : {
                        'filter' : {
                            'bool' : {
                                'should' : should
                            }
                        }
                    }
                }
            };
        }
        // TODO: check if this is still a use case
        else if (options.categoryId) {
            queryOptions = {
                'query': {
                    'nested': {
                        'path': 'categories',
                        'query': {
                            'match': {
                                'categories.id': options.categoryId
                            }
                        }
                    }
                }
            };
            if (config.sort) {
                queryOptions.sort = config.sort;
            }
        } else {
            queryOptions = options;
        }

        return $http({
            method: 'POST',
            url: url,
            data: queryOptions
        })
        .then(function (data) {
            return {
                items: data.data.hits.hits,
                meta: {
                    total: data.data.hits.total,
                    size:  data.config.data.size,
                    from:  data.config.data.from
                }
            };
        });
    };
};
