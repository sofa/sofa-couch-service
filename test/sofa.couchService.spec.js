'use strict';
/* global sofa */
/* global AsyncSpec */

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

        var httpService,
            async = new AsyncSpec(this);

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

        async.it('can get category', function (done) {
            var categoryUrlId = 'child1';

            httpService.when('post', url).respond(wrapAsResponse(cats));
            couchService.getCategory(categoryUrlId).then(function (data) {
                expect(data.label).toEqual('child 1');
                expect(data.isRoot).toBe(false);
                done();
            });
        });

        async.it('can get root category', function (done) {
            httpService.when('post', url).respond(wrapAsResponse(cats));
            couchService
                .getCategory()
                .then(function (data) {
                    expect(data.isRoot).toBe(true);
                    done();
                });
        });


        async.it('can get products', function (done) {
            httpService.when('post', productUrl).respond(wrapAsResponse(products));
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


        async.it('can get a single product', function (done) {
            httpService.when('post', singleProductUrl).respond(wrapAsResponse([products[2]]));

            couchService
                .getProduct('3')
                .then(function (product) {
                    expect(product.id).toEqual('3');
                    done();
                });
        });

        async.it('product instances of same products are always equal', function (done) {
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
    });
});
