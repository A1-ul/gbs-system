"use strict";
const registry = new Map();

function registerIndex(name, provider) {
    registry.set(name, provider);
}

function getIndex(name) {
    return registry.get(name);
}

module.exports = { registerIndex, getIndex, registry };
