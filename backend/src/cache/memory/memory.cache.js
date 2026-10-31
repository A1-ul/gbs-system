"use strict";
const store = new Map();

function get(key) {
    return store.get(key) || null;
}

function set(key, value, ttlMs = 300000) {
    store.set(key, value);
    setTimeout(() => store.delete(key), ttlMs).unref();
}

function del(key) {
    return store.delete(key);
}

function clear() {
    store.clear();
}

module.exports = { get, set, del, clear, getStatus: async () => ({ status: "active" }) };
