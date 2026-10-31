"use strict";

const {
    isRedisConnected
} = require(
    "../../config/redis"
);

async function checkRedis() {

    return {

        healthy:
            isRedisConnected(),

        timestamp:
            new Date()
                .toISOString()
    };
}

module.exports =
    checkRedis;