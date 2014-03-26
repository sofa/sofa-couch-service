'use strict';
/* global sofa */
/* global AsyncSpec */
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
            urlId: 'a'
        };

        var b = {
            urlId: 'b',
            parent: a
        };

        expect(couchService.isAParentOfB(a, b)).toBe(true);
        expect(couchService.isAParentOfB(b, a)).toBe(false);

        expect(couchService.isAChildOfB(b, a)).toBe(true);
        expect(couchService.isAChildOfB(a, b)).toBe(false);
    });

    it('should detect indirect parent<->child relationships', function () {

        var a = {
            urlId: 'a'
        };

        var b = {
            urlId: 'b',
            parent: a
        };

        var c = {
            urlId: 'c',
            parent: b
        };

        expect(couchService.isAParentOfB(a, c)).toBe(true);
        expect(couchService.isAParentOfB(c, a)).toBe(false);

        expect(couchService.isAChildOfB(c, a)).toBe(true);
        expect(couchService.isAChildOfB(a, c)).toBe(false);
    });

    it('should detect a being a child alias of b', function () {

        var a = {
            urlId: 'a'
        };

        var b = {
            urlId: 'b',
            children: [
                { urlId: 'x'},
                { urlId: 'a'}
            ]
        };

        expect(couchService.isAChildAliasOfB(a, b)).toBe(true);
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

        var categories = {
            'label': 'root',
            'urlId': 'root',
            'children': [{
                'label': 'child 1',
                'urlId': 'child1',
                'children': [{
                    'label': 'child2',
                    'urlId': 'child2'
                }]
            }, {
                'label': 'child 2',
                'urlId': 'child2',
                'children': [{
                    'label': 'grandchild 4',
                    'urlId': 'grandchild4'
                }, {
                    'label': 'grandchild 5',
                    'urlId': 'grandchild5'
                }]
            }]
        };

        beforeEach(function () {
            httpService = createHttpService();
            couchService = new sofa.CouchService(httpService, q, configService);
        });

        async.it('can get category', function (done) {
            var categoryUrlId = 'child1';
            var url = sofa.Config.categoryJson;

            httpService.when('get', url).respond(categories);
            couchService.getCategory(categoryUrlId).then(function (data) {
                expect(data.label).toEqual('child 1');
                expect(data.isRoot).toBe(false);
                done();
            });
        });

        async.it('can get root category', function (done) {

            var url = sofa.Config.categoryJson;
            httpService.when('get', url).respond(categories);
            couchService
                .getCategory()
                .then(function (data) {
                    expect(data.label).toEqual('root');
                    expect(data.isRoot).toBe(true);
                    done();
                });
        });

        async.it('if a category has aliases it should return the category with children', function (done) {
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

        async.it('can get products', function (done) {
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
                .getProducts(categoryUrlId)
                .then(function (data) {
                    expect(data.length).toBe(16);
                    done();
                });
        });

        async.it('can get a single product', function (done) {
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
                    done();
                });
        });

        async.it('can get the next product of the same category (with cached products)', function (done) {

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

        async.it('can get the next product of the same category (WITHOUT cached products)', function (done) {
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

        async.it('returns "null" for the next product when reached the end', function (done) {
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

        async.it('returns the first product of the category for the next product when reached the end and using the circle parameter', function (done) {
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

        async.it('can get the previous product of the same category (with cached products)', function (done) {
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

        async.it('can get the previous product of the same category (WITHOUT cached products)', function (done) {
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

        async.it('returns null for the previous product when reached the start', function (done) {
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

        async.it('returns the last product of the category for the previous product when reached the start and using the circle parameter', function (done) {
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
