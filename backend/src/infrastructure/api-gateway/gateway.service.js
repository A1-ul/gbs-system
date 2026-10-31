"use strict";

const registry =
    require(
        "./gateway.registry"
    );

function resolveRoute(
    service
) {

    return registry.getRoute(
        service
    );
}

function getGatewayInfo() {

    return {

        service:
            "GBS API Gateway",

        timestamp:
            new Date()
                .toISOString()
    };
}

module.exports =
    Object.freeze({

        resolveRoute,

        getGatewayInfo
    });