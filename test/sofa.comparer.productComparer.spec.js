'use strict';
/* global sofa */

describe('sofa.comparer.ProductComparer', function () {

    var comparer;

    beforeEach(function () {
        comparer = new sofa.comparer.ProductComparer();
    });

    it('should be defined', function () {
        expect(comparer).toBeDefined();
    });

    it('should be a function', function () {
        expect(typeof comparer).toBe('function');
    });

    it('should return a boolean', function () {
        expect(typeof comparer('foo', 'foo')).toBe('boolean');
    });

    it('should return true if both args are equal', function () {
        expect(comparer('foo', 'foo')).toBe(true);
    });

    it('should reutrn true if both args have an equal prop urlKey', function () {
        var obj = {
            urlKey: 'foo'
        };
        expect(comparer(obj, obj)).toBe(true);
    });

    it('should reutrn true if both args have an equal prop id', function () {
        var obj = {
            id: 'foo'
        };
        expect(comparer(obj, obj)).toBe(true);
    });
});
