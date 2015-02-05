/**
<<<<<<< HEAD:dist/sofa.couchService.js
 * sofa-couch-service - v0.14.1 - 2015-02-24
=======
 * sofa-couch-service - v0.14.1 - Thu Feb 05 2015 11:16:39 GMT+0100 (CET)
>>>>>>> feat(sofa.CouchService): introduces new build process:dist/sofaCouchService.js
 * 
 *
 * Copyright (c) 2014 CouchCommerce GmbH (http://www.couchcommerce.com / http://www.sofa.io) and other contributors
 * THIS SOFTWARE CONTAINS COMPONENTS OF THE SOFA.IO COUCHCOMMERCE SDK (WWW.SOFA.IO)
 * IT IS PROVIDED UNDER THE LICENSE TERMS OF THE ATTACHED LICENSE.TXT.
 */
;(function (sofa, document, undefined) {
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

    self.createFirstPageInfo = function () {
        return new PageInfo(DEFAULT_PAGE_SIZE, 0);
    };

    return self;
});

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

        category.image = MEDIA_FOLDER + category.urlId + '.' + MEDIA_IMG_EXTENSION;
            
        return category;
    };
});

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
 * @sofadoc class
 * @name sofa.comparer.ProductComparer
 * @namespace sofa.comparer
 *
 * @package sofa-couch-service
 * @requiresPackage sofa-core
 * @requiresPackage sofa-http-service
 *
 * @distFile dist/sofa.checkoutService.js
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

'use strict';
/* global sofa */
<<<<<<< HEAD:dist/sofa.couchService.js

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

    self.createFirstPageInfo = function () {
        return new PageInfo(DEFAULT_PAGE_SIZE, 0);
    };

    return self;
});

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
sofa.CategoryTreeResolver = function ($http, $q, configService) {

    var ENDPOINT = configService.get('esEndpoint') + 'category/_search';

    var getCategoriesFromLevel = function (all, level) {
        return all.filter(function (category) {
            return category.level === level;
        });
    };

    var distributeToParents = function (levelCategories, parents) {
        for (var i = 0; i < parents.length; i++) {
            var currentParent = parents[i];
            var categoriesForParent = filterByParent(levelCategories, currentParent.id);
            currentParent.children = categoriesForParent;
        }
    };

    var filterByParent = function (all, parentId) {
        return all.filter(function (category) {
            return category.parentId === parentId;
        });
    };

    var getRootCategoryId = function (categories) {
        var firstLevelCategories = categories.filter(function (category) {
            return category.level === 2;
        });

        return firstLevelCategories[0].parentId;
    };

    return function () {

        return $http({
            method: 'POST',
            url: ENDPOINT,
            data: {
                size: 100000,
                query: {
                    filtered: {
                        filter: {
                            term: {
                                active: true
                            }
                        }
                    }
                }
            }
        })
            .then(function (result) {

                var hits = result.data.hits.hits,
                    plainHits = hits.map(function (hit) {
                        //we make label a synonym for backwards compatibility
                        hit._source.label = hit._source.name;

                        return hit._source;
                    }),
                    rootCategory = {
                        label: '',
                        id: getRootCategoryId(plainHits),
                        route: '/',
                        children: []
                    },
                    currentLevel = 2,
                    currentLevelCategories = getCategoriesFromLevel(plainHits, currentLevel),
                    parents = [rootCategory];

                while (currentLevelCategories.length > 0) {
                    distributeToParents(currentLevelCategories, parents);

                    currentLevel++;
                    parents = currentLevelCategories;
                    currentLevelCategories = getCategoriesFromLevel(plainHits, currentLevel);
                }

                return { data: rootCategory };
            });
    };
};

'use strict';
/* global sofa */
/**
 * @sofadoc class
 * @name sofa.comparer.ProductComparer
 * @namespace sofa.comparer
 *
 * @package sofa-couch-service
 * @requiresPackage sofa-core
 * @requiresPackage sofa-http-service
 *
 * @distFile dist/sofa.checkoutService.js
 *
 * @description
 *
 */
sofa.define('sofa.comparer.ProductComparer', function () {
    return function (a, b) {
        //either compare products by object identity or id identity
        return  a === b || a.id && b.id && a.id === b.id;
    };
});

'use strict';
/* global sofa */
=======
>>>>>>> feat(sofa.CouchService): introduces new build process:dist/sofaCouchService.js
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
     * @return {str} The hash
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
     * @return {str} The hash
     */
    self.hashObject = function (obj) {
        return self.hashString(JSON.stringify(obj));
    };

    return self;
};
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

'use strict';
/* global sofa */
/**
 * @name SingleProductResolver
 * @namespace sofa.SingleProductResolver
 *
 * @description
 * `SingleProductResolver` is used within the`CouchService` 
 * to resolve a singke product for a given product id. 
 * It can easily be overwritten to swap out the resolve strategy.
 */
sofa.define('sofa.SingleProductResolver', function (couchService, $http, $q, configService) {

    var url = configService.get('esEndpoint') + 'product/_search?size=1';

    return function (productId) {
        return $http({
            method: 'POST',
            url: url,
            data: {
                'query': {
                    'filtered': {
                        'filter': {
                            'term': {
                                'id': productId
                            }
                        }
                    }
                }
            }
        })
        .then(function (data) {
            return data.data.hits.hits.length > 0 ? data.data.hits.hits[0] : null;
        });
    };
});
}(sofa, document));
