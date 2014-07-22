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