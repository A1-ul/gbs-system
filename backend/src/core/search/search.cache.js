"use strict";
const cache = new Map();

function get(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
    }
    return item.value;
}

function set(key, value, ttlSeconds = 60) {
    cache.set(key, {
        value,
        expiry: Date.now() + (ttlSeconds * 1000)
    });
}

module.exports = { get, set };
