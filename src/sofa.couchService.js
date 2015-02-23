'use strict';
/* global sofa */
/**
 * @sofadoc class
 * @name sofa.CouchService
 *
 * @package sofa-couch-service
 * @requiresPackage sofa-core
 * @requiresPackage sofa-http-service
 * @requiresPackage sofa-q-service
 *
 * @requires sofa.HttpService
 * @requires sofa.QService
 * @requires sofa.configService
 *
 * @distFile dist/sofa.couchService.js
 *
 * @description
 * `CouchService` let's you interact with the CouchCommerce API. It provides methods
 * to get products, get preview data or handling with categories.
 */
sofa.define('sofa.CouchService', function ($http, $q, configService) {

    var self                    = {},
        categoryTreeResolver    = new sofa.CategoryTreeResolver($http, $q, configService),
        productBatchResolver    = new sofa.ProductBatchResolver($http, $q, configService),
        singleProductResolver   = new sofa.SingleProductResolver(self, $http, $q, configService),
        productDecorator        = new sofa.ProductDecorator(configService),
        categoryDecorator       = new sofa.CategoryDecorator(configService),
        pageInfoFactory         = new sofa.PageInfoFactory(configService),
        productByKeyCache       = new sofa.InMemoryObjectStore(),
        productsByCriteriaCache = new sofa.InMemoryObjectStore(),
        hashService             = new sofa.HashService(),
        categoryMap             = null,
        inFlightCategories      = null;

    var MEDIA_PLACEHOLDER       = configService.get('mediaPlaceholder'),
        USE_SHOP_URLS           = configService.get('useShopUrls', false);

    //allow this service to raise events
    sofa.observable.mixin(self);

    /**
     * @sofadoc method
     * @name sofa.CouchService#isAParentOfB
     * @memberof sofa.CouchService
     *
     * @description
     * Checks whether a given category is the parent of another category taking
     * n hops into account.
     *
     * @param {object} a Category a.
     * @param {object} b Category b.
     *
     * @return {boolean}
     */
    self.isAParentOfB = function (categoryA, categoryB) {
        //short circuit if it's a direct parent, if not recursively check
        return categoryB.parent === categoryA ||
               (categoryB.parent && self.isAParentOfB(categoryA, categoryB.parent)) === true;
    };

    /**
     * @sofadoc method
     * @name sofa.CouchService#isAChildOfB
     * @memberof sofa.CouchService
     *
     * @description
     * Checks whether a given category is the child
     * of another category taking n hops into account.
     *
     * @param {object} a Category a.
     * @param {object} b Category b.
     *
     * @return {boolean}
     */
    self.isAChildOfB = function (categoryA, categoryB) {
        return self.isAParentOfB(categoryB, categoryA);
    };


    /**
     * @method createPageInfo
     * @memberof sofa.CouchService
     *
     * @description
     * Creates a PageInfo object from a set of entities.
     *
     * @param {entities} An array of entities.
     *
     * @return {object} The PageInfo object.
     */
    self.createPageInfo = function (entities) {
        return entities ?
        pageInfoFactory.createPageInfo(entities) : pageInfoFactory.createFirstPageInfo();
    };

    /**
     * @sofadoc method
     * @name sofa.CouchService#getCategory
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches the category with the given `categoryId` If no category is
     * specified, the method defaults to the root category.
     *
     * @param {string} categoryId The ID of the category to be fetched.
     * @return {Promise} A promise.
     */
    self.getCategory = function (categoryId) {
        if (!categoryId && !categoryMap) {
            return fetchAllCategories();
        } else if (!categoryId && categoryMap) {
            return $q.when(categoryMap.rootCategory);
        } else if (categoryId && categoryId.length > 0 && !categoryMap) {
            return fetchAllCategories().then(function () {
                return categoryMap.getCategory(categoryId);
            });
        } else if (categoryId && categoryId.length > 0 && categoryMap) {
            return $q.when(categoryMap.getCategory(categoryId));
        }
    };

    /**
     * @sofadoc method
     * @name sofa.CouchService#getProducts
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches all products of a given category.
     *
     * @param {int} categoryId The id of the category to fetch the products from.
     * @return {Promise} A promise that gets resolved with products.
     */
    self.getProducts = function (categoryId, config) {

        var options = {
            categoryId: categoryId,
            config: config
        };

        return self.getProductsByRawOptions(options);
    };

    /**
     * @method getProductsById
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches a collection of products by a collection of productIds.
     *
     * @param {array} the collection of productIds to fetch the products for.
     * @preturn {Promise} A promise that gets resolved with products.
     */
    self.getProductsById = function (productIds, config) {
        var options = {
            productIds: productIds,
            config: config
        };

        return self.getProductsByRawOptions(options);
    };

    /**
     * @method getProductsByRawOptions
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches all products of a given option object. This is the lowest level method for
     * product retrieval. It just hands over the options to the `sofa.ProductBatchResolver`
     * and let it do the work. Results will automatically be cached for later queries that
     * share the same options.
     *
     * @param {object} options object that will be passed to the `sofa.ProductBatchResolver`.
     * @preturn {Promise} A promise that gets resolved with products.
     */
    self.getProductsByRawOptions = function (options) {

        var cacheKey = hashService.hashObject(options);


        var getProductId = function (product) {
            return product.id;
        };

        if (!productsByCriteriaCache.exists(cacheKey)) {
            return productBatchResolver(options).then(function (result) {
                var legacy = sofa.Util.isArray(result);
                var productsArray = legacy ? result : result.items;
                var tempProducts = augmentProducts(productsArray, options);
                var indexedProducts = productByKeyCache.addOrUpdateBatch(tempProducts, getProductId);

                // if the call did not yield results, don't put an empty array in the cache.
                // This would prevent further XHRs for this query even if we don't have results
                if (indexedProducts.length > 0) {
                    // FixMe we are effectively creating a memory leak here by caching all seen products forever
                    productsByCriteriaCache.addOrUpdate(cacheKey, legacy ? indexedProducts : {
                        items: indexedProducts,
                        meta: result.meta
                    });
                }
                
                return legacy ? indexedProducts : {
                    items: indexedProducts,
                    meta: result.meta
                };
            });
        }

        return $q.when(productsByCriteriaCache.get(cacheKey));
    };

    var augmentProducts = function (products, options) {
        return products.map(function (product) {
            return augmentProduct(product, options);
        });
    };

    var augmentProduct = function (product) {
        // apply any defined decorations
        product = productDecorator(product);

        var fatProduct = sofa.Util.extend(new cc.models.Product({
            mediaPlaceholder: MEDIA_PLACEHOLDER,
            useShopUrls: USE_SHOP_URLS
        }), product);
        self.emit('productCreated', self, fatProduct);
        return fatProduct;
    };

    /**
     * @sofadoc method
     * @name sofa.CouchService#getProduct
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches a single product. 
     *
     * @param {int} id of the product.
     *
     * @return {object} product
     */

    self.getProduct = function (id) {
        if (!productByKeyCache.exists(id)) {
            return singleProductResolver(id)
                    .then(function (product) {

                        // make sure to return early if no matching product was found
                        if (!product) {
                            return product;
                        }

                        // For the default SingleProductResolver this is superflous extra work
                        // because it internally calls getProducts(..) which does all this work
                        // for us behind the scene. But then the default SingleProductResolver
                        // implementation is just a workaround for a shitty default API. 
                        // For any other implementation (e.g. elasticsearch based) we expect
                        // augmentProduct to be called for us. Duplicating the work shouldn't have much
                        // performance impact. Let's favor correctness over performance here.
                        var fatProduct = augmentProduct(product);

                        return productByKeyCache.addOrUpdate(id, fatProduct);
                    });
        }
        else {
            return $q.when(productByKeyCache.get(id));
        }
    };

    var fetchAllCategories = function () {
        //if multiple parties cause fetching all categories at startup
        //we need to make sure they actually only cause loading the categories
        //ONCE! Otherwise we end up with multiple instances of our category tree
        //and hell breaks loose.
        //TODO: at tests for this!

        if (!inFlightCategories) {
            inFlightCategories = categoryTreeResolver().then(function (data) {
                var rootCategory = data.data;
                categoryMap = new sofa.util.CategoryMap();

                // we need to do the extend in that order even so it means
                // that we copy methods over. For the rootCategory, we could
                // probably reverse the order but we keep it this way for consistency.
                // Read beneath for more info.
                rootCategory = sofa.Util.extend(rootCategory, new cc.models.Category({
                    useShopUrls: USE_SHOP_URLS
                }));

                categoryMap.rootCategory = rootCategory;
                augmentCategories(rootCategory);
                return rootCategory;
            });
        }

        return inFlightCategories;
    };

    var augmentCategories = function (rootCategory) {
        //we need to fix the id for the rootCategory to be empty
        rootCategory.id = '';
        rootCategory.isRoot = true;

        self.emit('categoryCreated', self, rootCategory);

        var iterator = new sofa.util.TreeIterator(rootCategory, 'children');
        iterator.iterateChildren(function (category, parent) {
            category.isRoot = category.isRoot || false;
            category.parent = parent;
            category.hasChildren = category.children && category.children.length > 0;

            // apply any defined decorations
            category = categoryDecorator(category);

            // we have to do the extend in this order. It's a bit unfortunate
            // because that means that all methods of cc.modelCategory end up
            // *directly* on the object rather than on it's prototype which would
            // be better in terms of memory consumption (like we do it for products).
            //
            // We can't do that however because of the way we iterate through the tree.
            // We would invalidate references between the objects which in turn breaks
            // other code that relies on references to match.
            category = sofa.Util.extend(category, new cc.models.Category({
                useShopUrls: USE_SHOP_URLS
            }));

            categoryMap.addCategory(category);
            self.emit('categoryCreated', self, category);
        });
    };

    return self;
});
