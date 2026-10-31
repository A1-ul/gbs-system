"use strict";
const registry = new Map();

function register(name, worker) {
    registry.set(name, worker);
}

function get(name) {
    return registry.get(name);
}

module.exports = { register, get, registry };
