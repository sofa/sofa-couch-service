/**
 * sofa-couch-service - v0.7.0 - 2014-07-23
 * 
 *
 * Copyright (c) 2014 CouchCommerce GmbH (http://www.couchcommerce.com / http://www.sofa.io) and other contributors
 * THIS SOFTWARE CONTAINS COMPONENTS OF THE SOFA.IO COUCHCOMMERCE SDK (WWW.SOFA.IO).
 * IT IS PROVIDED UNDER THE LICENSE TERMS OF THE ATTACHED LICENSE.TXT.
 */
;(function (sofa, undefined) {

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
        productDecorator        = new sofa.ProductDecorator(configService),
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

                // FixMe we are effectively creating a memory leak here by caching all seen products forever
                productsByCriteriaCache.addOrUpdate(cacheKey, indexedProducts);

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
            return self.getProducts(categoryUrlId).then(function () {
                return self.getProduct(categoryUrlId, productUrlId);
            });
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

'use strict';
/* global sofa */

/**
 * @name InMemoryObjectStore
 * @namespace sofa.InMemoryObjectStore
 *
 * @description
 * A simple object store that allows storing, updating objects in memory.
 * The object store asures that updated objects will always keep the instance
 * that was created first. In other words, objects are patched to be updated
 * rather than replaced.
 */
sofa.InMemoryObjectStore = function () {

    var self = {},
        cache = {};

    /**
     * @method addOrUpdate
     * @memberof sofa.InMemoryObjectStore
     *
     * @description
     * Adds or updates an object in the store. For updates, it is guaranteed that no
     * new instance is created. The initial instance is patched
     *
     * @param {key} Key of the object to add/update
     * @param {item} The object to add/update
     * @preturn {object} The stored object
     */
    self.addOrUpdate = function (key, item) {

        if (!cache[key]) {
            cache[key] = item;
        }
        else {
            sofa.Util.extend(cache[key], item);
        }

        return cache[key];
    };

    /**
     * @method addOrUpdateBatch
     * @memberof sofa.InMemoryObjectStore
     *
     * @description
     * Adds or updates a batch of objects in the store. For updates, it is guaranteed that no
     * new instance are created. The initial instances are patched
     *
     * @param {batch} array of objects to add/update
     * @param {keyExctractor} A function to extract the key of each item in the batch
     * @preturn {array} An array containing each created/updated instance
     */
    self.addOrUpdateBatch = function (batch, keyExtractor) {
        var added = [];
        var keys = {};

        batch.forEach(function (item) {
            var key = keyExtractor(item);

            // it is not allowed for one batch to contain multiple objects
            // with the same key
            if (!keys[key]) {
                var updatedItem = self.addOrUpdate(key, item);
                added.push(updatedItem);
                keys[key] = true;
            }
        });

        return added;
    };

    /**
     * @method get
     * @memberof sofa.InMemoryObjectStore
     *
     * @description
     * Retrieves an object from the store
     *
     * @param {key} The key of the object to retrieve
     * @preturn {object} The retrieved object
     */
    self.get = function (key) {
        return cache[key];
    };

    /**
     * @method exists
     * @memberof sofa.InMemoryObjectStore
     *
     * @description
     * Checks if an object exists in the store
     *
     * @param {key} The key of the object to check for existence
     * @preturn {boolean} A boolean to indicate whether the object exists or not
     */
    self.exists = function (key) {
        return self.get(key) !== undefined;
    };

    return self;
};
'use strict';
/* global sofa */
/**
 * @name CategoryTreeResolver
 * @namespace sofa.CategoryTreeResolver
 *
 * @description
 * `CategoryTreeResolver` is used within the`CouchService` to resolve the tree of categories.
 * It can easily be overwritten to swap out the resolve strategy.
 */
sofa.define('sofa.CategoryTreeResolver', function ($http, $q, configService) {
    var CATEGORY_JSON = configService.get('categoryJson');

    return function () {
        return $http({
            method: 'get',
            url: CATEGORY_JSON
        });
    };
});

'use strict';
/* global sofa */
/**
 * @name ProductComparer
 * @namespace cc.comparer.ProductComparer
 *
 * @description
 *
 */
sofa.define('sofa.comparer.ProductComparer', function () {
    return function (a, b) {

        //either compare products by object identity, urlKey identity or id identity
        return  a === b ||
                a.urlKey && b.urlKey && a.urlKey === b.urlKey ||
                a.id && b.id && a.id === b.id;
    };
});

'use strict';
/* global sofa */
/*jshint bitwise: false*/

/**
 * @name HashService
 * @namespace sofa.HashService
 *
 * @description
 * A service that creates hashes for strings or objects. This might be refactored
 * into a self contained sofa service in the future.
 */
sofa.HashService = function () {

    var self = {};

    /**
     * @method hashString
     * @memberof sofa.HashService
     *
     * @description
     * Creates a hash for the given string
     *
     * @param {str} The string to base the hash on
     * @preturn {str} The hash
     */
    self.hashString = function (str) {
        // http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
        var hash = 0, i, chr, len;
        if (str.length === 0) {
            return hash;
        }

        for (i = 0, len = str.length; i < len; i++) {
            chr   = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }

        return hash.toString();
    };

    /**
     * @method hashObject
     * @memberof sofa.HashService
     *
     * @description
     * Creates a hash for the given object
     *
     * @param {obj} The object to base the hash on
     * @preturn {str} The hash
     */
    self.hashObject = function (obj) {
        return self.hashString(JSON.stringify(obj));
    };

    return self;
};
'use strict';
/* global sofa */
/**
 * @name CategoryMap
 * @namespace sofa.helper.CategoryMap
 *
 * @description
 * Category mapping service that sets up mappings between category urls and category
 * objects.
 */
sofa.define('sofa.util.CategoryMap', function () {


    var self = {};

    var map = {};

    /**
     * @method addCategory
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
     * @method getCategory
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

'use strict';
/* global sofa */
/**
 * @name ProductBatchResolver
 * @namespace sofa.ProductBatchResolver
 *
 * @description
 * `ProductBatchResolver` is used within the`CouchService` to resolve a batch of products
 * for a given categoryUrlId. It can easily be overwritten to swap out the resolve strategy.
 */
sofa.define('sofa.ProductBatchResolver', function ($http, $q, configService) {
    var API_URL             = configService.get('apiUrl'),
        //this is not exposed to the SAAS hosted product, hence the default value
        API_HTTP_METHOD     = configService.get('apiHttpMethod', 'jsonp'),
        STORE_CODE          = configService.get('storeCode');

    return function (categoryUrlId) {
        return $http({
            method: API_HTTP_METHOD,
            url: API_URL +
            '?&stid=' +
            STORE_CODE +
            '&cat=' + categoryUrlId +
            '&callback=JSON_CALLBACK'
        })
        .then(function (data) {
            return data.data.products;
        });
    };
});

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

} (sofa));
