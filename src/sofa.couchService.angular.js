'use strict';

angular.module('sofa.couchService', ['sofa.core'])

.factory('couchService', function ($http, $q, configService) {
    return new sofa.CouchService($http, $q, configService);
});
