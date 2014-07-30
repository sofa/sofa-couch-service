'use strict';
/* global sofa */
/**
 * @name CouchService
 * @namespace sofa.CouchService
 *
 * @description
 * `CouchService` let's you interact with the CouchCommerce API. It provides methods
 * to get products, get preview data or handling with categories.
 */
sofa.define('sofa.CouchService', function ($http, $q, configService) {

    var self                    = {},
        productComparer         = new sofa.comparer.ProductComparer(),
        categoryTreeResolver    = new sofa.CategoryTreeResolver($http, $q, configService),
        productBatchResolver    = new sofa.ProductBatchResolver($http, $q, configService),
        singleProductResolver   = new sofa.SingleProductResolver(self, $http, $q, configService),
        productDecorator        = new sofa.ProductDecorator(configService),
        pageInfoFactory         = new sofa.PageInfoFactory(configService),
        productByKeyCache       = new sofa.InMemoryObjectStore(),
        productsByCriteriaCache = new sofa.InMemoryObjectStore(),
        hashService             = new sofa.HashService(),
        categoryMap             = null,
        inFlightCategories      = null;

    var MEDIA_FOLDER            = configService.get('mediaFolder'),
        MEDIA_IMG_EXTENSION     = configService.get('mediaImgExtension'),
        MEDIA_PLACEHOLDER       = configService.get('mediaPlaceholder'),
        USE_SHOP_URLS           = configService.get('useShopUrls', false);

    //allow this service to raise events
    sofa.observable.mixin(self);

    /**
     * @method isAChildAliasOfB
     * @memberof sofa.CouchService
     *
     * @description
     * Checks whether a given category a exists as an child
     * on another category b. Taking only direct childs into account.
     *
     * @param {object} a Category a.
     * @param {object} b Category b.
     *
     * @return {boolean}
     */
    self.isAChildAliasOfB = function (categoryA, categoryB) {
        if (!categoryB.children || categoryB.children.length === 0) {
            return false;
        }

        var alias = sofa.Util.find(categoryB.children, function (child) {
            return child.urlId === categoryA.urlId;
        });

        return !sofa.Util.isUndefined(alias);
    };

    /**
     * @method isAParentOfB
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
     * @method isAChildOfB
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
        return pageInfoFactory.createPageInfo(entities);
    };

    /**
     * @method getCategory
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches the category with the given `categoryUrlId` If no category is
     * specified, the method defaults to the root category.
     *
     * @param {object} categoryUrlId The category to be fetched.
     * @return {Promise} A promise.
     */
    self.getCategory = function (category) {
        if (!category && !categoryMap) {
            return fetchAllCategories();
        } else if (!category && categoryMap) {
            return $q.when(categoryMap.rootCategory);
        } else if (category && category.length > 0 && !categoryMap) {
            return fetchAllCategories().then(function () {
                return categoryMap.getCategory(category);
            });
        } else if (category && category.length > 0 && categoryMap) {
            return $q.when(categoryMap.getCategory(category));
        }
    };

    var getUrlKey = function (product) {
        return product.categoryUrlId + product.urlKey;
    };

    /**
     * @method getProducts
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches all products of a given category.
     *
     * @param {int} categoryUrlId The urlId of the category to fetch the products from.
     * @preturn {Promise} A promise that gets resolved with products.
     */
    self.getProducts = function (categoryUrlId, config) {

        var cacheKey = hashService.hashObject({
            categoryUrlId: categoryUrlId,
            config: config
        });

        if (!productsByCriteriaCache.exists(cacheKey)) {
            return productBatchResolver(categoryUrlId, config).then(function (productsArray) {
                var tempProducts = augmentProducts(productsArray, categoryUrlId);

                var indexedProducts = productByKeyCache.addOrUpdateBatch(tempProducts, getUrlKey);

                // if the call did not yield results, don't put an empty array in the cache.
                // This would prevent further XHRs for this query even if we don't have results
                if (indexedProducts.length > 0) {
                    // FixMe we are effectively creating a memory leak here by caching all seen products forever
                    productsByCriteriaCache.addOrUpdate(cacheKey, indexedProducts);
                }
                
                return indexedProducts;
            });
        }

        return $q.when(productsByCriteriaCache.get(cacheKey));
    };

    //it's a bit akward that we need to do that. It should be adressed
    //directly on our server API so that this extra processing can be removed.
    var augmentProducts = function (products, categoryUrlId) {
        return products.map(function (product) {
            // apply any defined decorations
            product = productDecorator(product);

            product.categoryUrlId = categoryUrlId;

            var fatProduct = sofa.Util.extend(new cc.models.Product({
                mediaPlaceholder: MEDIA_PLACEHOLDER,
                useShopUrls: USE_SHOP_URLS
            }), product);
            self.emit('productCreated', self, fatProduct);
            return fatProduct;
        });
    };

    /**
     * @method getNextProduct
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches the next product within the product's category.
     *
     * @param {object} product The product to find the neighbour of.
     * @return {object} Next product.
     */
    self.getNextProduct = function (product, circle) {

        var getTargetProduct = function (categoryProducts) {
            var index = getIndexOfProduct(categoryProducts, product);
            if (index > -1) {
                var nextProduct = categoryProducts[index + 1];
                var targetProduct = !nextProduct && circle ?
                                    categoryProducts[0] : nextProduct || null;

                return targetProduct;
            }
        };

        return getPreviousOrNextProduct(product, circle, getTargetProduct);
    };

    /**
     * @method getPreviousProduct
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches the previous product within the product's category.
     *
     * @param {object} product The product to find the neighbour of.
     * @return {object} Previous product.
     */
    self.getPreviousProduct = function (product, circle) {

        var getTargetProduct = function (categoryProducts, baseProduct) {
            var index = getIndexOfProduct(categoryProducts, baseProduct);
            if (index > -1) {
                var previousProduct = categoryProducts[index - 1];
                var targetProduct = !previousProduct && circle ?
                                    categoryProducts[categoryProducts.length - 1] :
                                    previousProduct || null;

                return targetProduct;
            }
        };

        return getPreviousOrNextProduct(product, circle, getTargetProduct);
    };

    var getPreviousOrNextProduct = function (product, circle, productFindFn) {
        var cachedProducts = productsByCriteriaCache.get(product.categoryUrlId);

        if (cachedProducts) {
            return $q.when(productFindFn(cachedProducts, product));
        } else {
            return  self.getProducts(product.categoryUrlId).then(function (catProducts) {
                return productFindFn(catProducts, product);
            });
        }
    };

    var getIndexOfProduct = function (productTable, product) {
        for (var i = 0; i < productTable.length; i++) {
            if (productComparer(productTable[i], product)) {
                return i;
            }
        }
        return -1;
    };

    /**
     * @method getProduct
     * @memberof sofa.CouchService
     *
     * @description
     * Fetches a single product. Notice that both the `categoryUrlId`
     * and the `productUrlId` need to be specified in order to get the product.
     *
     * @param {int} categoryUrlId The urlId of the category the product belongs to.
     * @param {int} productUrlId The urlId of the product itself.
     *
     * @return {object} product
     */
    self.getProduct = function (categoryUrlId, productUrlId) {
        var productCacheKey = categoryUrlId + productUrlId;
        if (!productByKeyCache.exists(productCacheKey)) {
            return singleProductResolver(categoryUrlId, productUrlId);
        }
        else {
            return $q.when(productByKeyCache.get(productCacheKey));
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
        //we need to fix the urlId for the rootCategory to be empty
        rootCategory.urlId = '';
        rootCategory.isRoot = true;

        self.emit('categoryCreated', self, rootCategory);

        var iterator = new sofa.util.TreeIterator(rootCategory, 'children');
        iterator.iterateChildren(function (category, parent) {
            category.isRoot = category.isRoot || false;
            category.parent = parent;
            category.image = MEDIA_FOLDER + category.urlId + '.' + MEDIA_IMG_EXTENSION;
            category.hasChildren = category.children && category.children.length > 0;

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
