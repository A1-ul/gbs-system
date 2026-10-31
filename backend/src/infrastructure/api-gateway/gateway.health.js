"use strict";

function getGatewayHealth() {

    return {

        healthy:
            true,

        uptime:
            process.uptime(),

        timestamp:
            new Date()
                .toISOString()
    };
}

module.exports =
    Object.freeze({

        getGatewayHealth
    });