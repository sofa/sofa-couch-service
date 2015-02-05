/**
 * sofa-couch-service - v0.14.1 - Thu Feb 05 2015 11:23:07 GMT+0100 (CET)
 * 
 *
 * Copyright (c) 2014 CouchCommerce GmbH (http://www.couchcommerce.com / http://www.sofa.io) and other contributors
 * THIS SOFTWARE CONTAINS COMPONENTS OF THE SOFA.IO COUCHCOMMERCE SDK (WWW.SOFA.IO)
 * IT IS PROVIDED UNDER THE LICENSE TERMS OF THE ATTACHED LICENSE.TXT.
 */
;(function (angular) {
'use strict';

angular.module('sofa.couchService', ['sofa.core'])

.factory('couchService', ["$http", "$q", "configService", function ($http, $q, configService) {
    return new sofa.CouchService($http, $q, configService);
}]);
}(angular));
