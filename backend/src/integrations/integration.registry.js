"use strict";

const registry =
    Object.create(
        null
    );

function register(
    name,
    service
) {

    registry[name] =
        service;

    return true;
}

function get(
    name
) {

    return (
        registry[name] ||
        null
    );
}

module.exports =
    Object.freeze({

        register,

        get
    });