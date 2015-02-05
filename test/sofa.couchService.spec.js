'use strict';
/* global sofa */
/* global SOFA_MOCK_PRODUCTS */

describe('sofa.couchService', function () {

    var couchService, q, httpService, configService;

    var createHttpService = function () {
        return new sofa.mocks.httpService(new sofa.QService());
    };

    beforeEach(function () {
        q = new sofa.QService();
        httpService = new sofa.HttpService(q);
        configService = new sofa.ConfigService();
        couchService = new sofa.CouchService(httpService, q, configService);
    });

    it('should be defined', function () {
        expect(couchService).toBeDefined();
    });

    it('should be an object', function () {
        expect(typeof couchService).toBe('object');
    });

    it('should detect direct parent<->child relationships', function () {

        var a = {
            id: 'a'
        };

        var b = {
            id: 'b',
            parent: a
        };

        expect(couchService.isAParentOfB(a, b)).toBe(true);
        expect(couchService.isAParentOfB(b, a)).toBe(false);

        expect(couchService.isAChildOfB(b, a)).toBe(true);
        expect(couchService.isAChildOfB(a, b)).toBe(false);
    });

    it('should detect indirect parent<->child relationships', function () {

        var a = {
            id: 'a'
        };

        var b = {
            id: 'b',
            parent: a
        };

        var c = {
            id: 'c',
            parent: b
        };

        expect(couchService.isAParentOfB(a, c)).toBe(true);
        expect(couchService.isAParentOfB(c, a)).toBe(false);

        expect(couchService.isAChildOfB(c, a)).toBe(true);
        expect(couchService.isAChildOfB(a, c)).toBe(false);
    });


    it('should detect no relationship', function () {

        var a = {
            urlId: 'a'
        };

        var a2 = {
            urlId: 'a2'
        };

        var b2 = {
            urlId: 'b2',
            parent: a2
        };

        expect(couchService.isAParentOfB(a, b2)).toBe(false);
        expect(couchService.isAChildOfB(a, b2)).toBe(false);

        expect(couchService.isAParentOfB(b2, a)).toBe(false);
        expect(couchService.isAChildOfB(b2, a)).toBe(false);
    });

    describe('async-tests', function () {

        var httpService;
            // async = new AsyncSpec(this);

        var cats = [
            {
                '_source': {
                    'name': 'root',
                    'id': 'root',
                    'level': 1
                }
            },
            {
                '_source': {
                    'name': 'child 1',
                    'id': 'child1',
                    'level': 2,
                    'parentId': 'root'
                }
            },
            {
                '_source': {
                    'name': 'grandchild 1',
                    'id': 'grandchild1',
                    'level': 3,
                    'parentId': 'child1'
                }
            },
            {
                '_source': {
                    'name': 'child 2',
                    'id': 'child2',
                    'level': 2,
                    'parentId': 'root'
                }
            },
            {
                '_source': {
                    'name': 'grandchild 2',
                    'id': 'grandchild2',
                    'level': 3,
                    'parentId': 'child2'
                }
            },
            {
                '_source': {
                    'name': 'grandchild 3',
                    'id': 'grandchild3',
                    'level': 3,
                    'parentId': 'child2'
                }
            }
        ];

        var products = [
            {
                '_source': {
                    'id': '1'
                }
            },
            // the conflicting id is intentional
            {
                '_source': {
                    'id': '1'
                }
            },
            {
                '_source': {
                    'id': '3'
                }
            },
            {
                '_source': {
                    'id': '4'
                }
            }
        ];

        var wrapAsResponse = function (items) {
            return {
                hits: {
                    hits: items,
                    total: items.length
                }
            };
        };

        var url = 'undefinedcategory/_search',
            productUrl = 'undefinedproduct/_search?pretty=true',
            singleProductUrl = 'undefinedproduct/_search?size=1';

        beforeEach(function () {
            httpService = createHttpService();
            couchService = new sofa.CouchService(httpService, q, configService);
        });

        it('can get category', function (done) {
            var categoryUrlId = 'child1';

            httpService.when('post', url).respond(wrapAsResponse(cats));
            couchService.getCategory(categoryUrlId).then(function (data) {
                expect(data.label).toEqual('child 1');
                expect(data.isRoot).toBe(false);
                done();
            });
        });

        it('can get root category', function (done) {
            var url = sofa.Config.categoryJson;
            httpService.when('get', url).respond(categories);

            couchService
                .getCategory()
                .then(function (data) {
                    expect(data.isRoot).toBe(true);
                    done();
                });
        });

        it('if a category has aliases it should return the category with children', function (done) {
            var categoryUrlId = 'child2';
            var url = cc.Config.categoryJson;

            httpService.when('get', url).respond(categories);
            couchService
                .getCategory(categoryUrlId)
                .then(function (data) {
                    expect(data.label).toEqual('child 2');
                    expect(data.children && data.children.length).toBe(2);
                    done();
                });
        });

        it('can get products', function (done) {
            var categoryUrlId = 'root';
            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);
            couchService
                .getProducts()
                .then(function (data) {
                    // it should be only three because there's a duplicate key violation that
                    // the couchService takes care of
                    expect(data.items.length).toBe(3);
                    // that's really wacko, it's 4 because this is the number directly returned by
                    // the http call. The couchServices takes out the duplicated products for us,
                    // which is why we only have three products in the array.
                    expect(data.meta.total).toBe(4);
                    done();
                });
        });

        it('removes products that violate duplicate key constraints', function (done) {

            // both products conflict with their urlKey. The urlKey is all we care about
            // the id is pretty irrelevant for sofa. Sofa has to treat the urlKey like an unique id.
            var responseWithConflictingKeys = {
                'queryDetails': {
                    'category': 'main',
                    'categoryName': 'Root',
                    'showSizeFilter': 'true',
                    'showColorFilter': 'true'
                },
                'totalCount': '2',
                'products': [
                        {'id': 1036, 'sku': '1172', 'name': 'foo', 'description': 'foo', 'urlKey': 'foo' },
                        {'id': 1036, 'sku': '1172', 'name': 'foo', 'description': 'foo', 'urlKey': 'foo' }
                    ]
                };

            var categoryUrlId = 'root';
            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(responseWithConflictingKeys);
            couchService
                .getProducts(categoryUrlId)
                .then(function (data) {
                    expect(data.length).toBe(1);
                    done();
                });
        });

        it('can get a single product', function (done) {
            var categoryUrlId = 'root';
            var productUrlId = 'fassbind-vieille-prune-obstbrand-pflaume-40-0-7l-flasche';

            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);

            couchService
                .getProduct('3')
                .then(function (product) {
                    expect(product.id).toEqual('3');
                    done();
                });
        });

        it('product instances of same products are always equal', function (done) {
            var firstBatch, secondBatch, singleProduct;

            httpService.when('post', productUrl).respond(wrapAsResponse(products));
            // explicitly creating a new instance here as a proof
            httpService.when('post', singleProductUrl).respond(wrapAsResponse([{
                '_source': {
                    'id': '3'
                }
            }]));


            var firstAction = couchService
                .getProducts(undefined, {order: 'desc'})
                .then(function (data) {
                    expect(data.items.length).toBe(3);
                    firstBatch = data.items;
                });

            var secondAction = couchService
                .getProducts(undefined, { order: 'asc' })
                .then(function (data) {
                    expect(data.items.length).toBe(3);
                    secondBatch = data.items;
                });

            var thirdAction = couchService
                .getProduct('3')
                .then(function (data) {
                    singleProduct = data;
                });
            q
            .all(firstAction, secondAction, thirdAction)
            .then(function () {
                // This makes sure that we tricked the couchService correctly to
                // perform multiple requests. We don't want instances to be
                // served from cache for this test!

                // It results in two requests because the third call can be served from cache

                expect(httpService.getCounter().requestCount).toBe(2);
                
                // test that those are really the same instances
                expect(firstBatch[0]).toBe(secondBatch[0]);
                expect(firstBatch[1]).toBe(singleProduct);

                done();
            });
        });

        it('can get the next product of the same category (with cached products)', function (done) {

            var categoryUrlId = 'root';
            var productUrlId = 'fassbind-vieille-prune-obstbrand-pflaume-40-0-7l-flasche';

            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);
            couchService
                .getProduct(categoryUrlId, productUrlId)
                .then(function (product) {
                    expect(product.id).toEqual(204);

                    couchService
                        .getNextProduct(product)
                        .then(function (nextProduct) {
                            expect(nextProduct.id).toBe(662);
                            done();
                        });
                });
        });

        it('can get the next product of the same category (WITHOUT cached products)', function (done) {
            var categoryUrlId = 'root';
            var productUrlId = 'fassbind-vieille-prune-obstbrand-pflaume-40-0-7l-flasche';

            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);

            var product = {
                urlKey: productUrlId,
                categoryUrlId: categoryUrlId
            };

            couchService
                .getNextProduct(product)
                .then(function (nextProduct) {
                    expect(nextProduct.id).toBe(662);
                    done();
                });
        });

        it('returns "null" for the next product when reached the end', function (done) {
            var categoryUrlId = 'root';
            var productUrlId = 'fassbind-vieille-framboise-alter-himbeerbrand-obstbrand-40-0-7l-flasche';

            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);

            couchService
                .getProduct(categoryUrlId, productUrlId)
                .then(function (product) {
                    expect(product.id).toBe(2720);

                    couchService
                        .getNextProduct(product)
                        .then(function (nextProduct) {
                            expect(nextProduct).toBe(null);
                            done();
                        });
                });
        });

        it('returns the first product of the category for the next product when reached the end and using the circle parameter', function (done) {
            var categoryUrlId = 'root';
            var productUrlId = 'fassbind-vieille-framboise-alter-himbeerbrand-obstbrand-40-0-7l-flasche';

            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);

            couchService
                .getProduct(categoryUrlId, productUrlId)
                .then(function (product) {
                    expect(product.id).toBe(2720);

                    couchService
                        .getNextProduct(product, true)
                        .then(function (nextProduct) {
                            expect(nextProduct.id).toBe(1036);
                            done();
                        });
                });
        });

        it('can get the previous product of the same category (with cached products)', function (done) {
            var categoryUrlId = 'root';
            var productUrlId = 'fassbind-obstbrand-walderdbeeren-reserve-privee-43-0-5-l-flasche';

            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);

            couchService
                .getProduct(categoryUrlId, productUrlId)
                .then(function (product) {
                    expect(product.id).toBe(662);

                    couchService
                        .getPreviousProduct(product)
                        .then(function (nextProduct) {
                            expect(nextProduct.id).toBe(204);
                            done();
                        });
                });
        });

        it('can get the previous product of the same category (WITHOUT cached products)', function (done) {
            var categoryUrlId = 'root';
            var productUrlId = 'fassbind-obstbrand-walderdbeeren-reserve-privee-43-0-5-l-flasche';

            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);

            var product = {
                urlKey: productUrlId,
                categoryUrlId: categoryUrlId
            };

            couchService
                        .getPreviousProduct(product)
                        .then(function (nextProduct) {
                            expect(nextProduct.id).toBe(204);
                            done();
                        });
        });

        it('returns null for the previous product when reached the start', function (done) {
            var categoryUrlId = 'root';
            var productUrlId = 'fassbind-brut-de-fut-williams-obstbrand-53-2-0-5-l-flasche';

            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);

            couchService
                .getProduct(categoryUrlId, productUrlId)
                .then(function (product) {
                    expect(product.id).toBe(1036);

                    couchService
                        .getPreviousProduct(product)
                        .then(function (nextProduct) {
                            expect(nextProduct).toBe(null);
                            done();
                        });
                });
        });

        it('returns the last product of the category for the previous product when reached the start and using the circle parameter', function (done) {
            var categoryUrlId = 'root';
            var productUrlId = 'fassbind-brut-de-fut-williams-obstbrand-53-2-0-5-l-flasche';

            //it's a bit whack that we have to know the exact URL to mock the http request
            //but on the other hand, how should it work otherwise?
            var url = sofa.Config.apiUrl +
                        '?&stid=' +
                        sofa.Config.storeCode +
                        '&cat=' + categoryUrlId +
                        '&callback=JSON_CALLBACK';

            httpService.when(sofa.Config.apiHttpMethod, url).respond(SOFA_MOCK_PRODUCTS);

            couchService
                .getProduct(categoryUrlId, productUrlId)
                .then(function (product) {
                    expect(product.id).toBe(1036);

                    couchService
                        .getPreviousProduct(product, true)
                        .then(function (nextProduct) {
                            expect(nextProduct.id).toBe(2720);
                            done();
                        });
                });
        });
    });
});
