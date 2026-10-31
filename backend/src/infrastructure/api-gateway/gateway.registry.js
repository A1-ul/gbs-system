"use strict";

const registry =
    Object.create(null);

function registerRoute(
    name,
    route
) {

    if (
        !name ||
        typeof route !== "string"
    ) {

        return false;
    }

    registry[name] =
        route;

    return true;
}

function getRoute(
    name
) {

    return (
        registry[name] ||
        null
    );
}

function getRoutes() {

    return Object.freeze({
        ...registry
    });
}

module.exports =
    Object.freeze({

        registerRoute,

        getRoute,

        getRoutes
    });