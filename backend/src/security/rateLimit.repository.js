"use strict";

const store =
    new Map();

function get(
    key
) {

    return (
        store.get(key) ||
        null
    );
}

function set(
    key,
    value
) {

    store.set(
        key,
        value
    );

    return true;
}

function remove(
    key
) {

    return store.delete(
        key
    );
}

module.exports =
    Object.freeze({

        get,

        set,

        remove
    });