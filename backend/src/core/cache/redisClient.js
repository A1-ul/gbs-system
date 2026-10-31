"use strict";

const Redis =
    require("ioredis");

let redis = null;

function createRedisClient() {
    try {
        const client =
            new Redis({

                host:
                    process.env.REDIS_HOST ||
                    "127.0.0.1",

                port:
                    Number(
                        process.env.REDIS_PORT
                    ) || 6379,

                password:
                    process.env.REDIS_PASSWORD ||
                    undefined,

                lazyConnect: true,

                enableReadyCheck: true,

                maxRetriesPerRequest: 3,

                connectTimeout: 10000,

                retryStrategy(
                    attempts
                ) {

                    if (
                        attempts > 5
                    ) {
                        return null;
                    }

                    return Math.min(
                        attempts * 500,
                        3000
                    );
                }
            });

        client.on(
            "connect",
            () => {
                console.log(
                    "✅ Redis connected"
                );
            }
        );

        client.on(
            "ready",
            () => {
                console.log(
                    "✅ Redis ready"
                );
            }
        );

        client.on(
            "reconnecting",
            () => {
                console.warn(
                    "⚠️ Redis reconnecting"
                );
            }
        );

        client.on(
            "error",
            (error) => {
                console.error(
                    "[REDIS ERROR]",
                    error.message
                );
            }
        );

        return client;
    } catch (error) {
        console.error(
            "[REDIS INIT ERROR]",
            error.message
        );

        return null;
    }
}

redis =
    createRedisClient();

async function connectRedis() {
    try {
        if (!redis) {
            return false;
        }

        if (
            redis.status ===
            "ready"
        ) {
            return true;
        }

        await redis.connect();

        return true;
    } catch (error) {
        console.error(
            "[REDIS CONNECT ERROR]",
            error.message
        );

        return false;
    }
}

async function disconnectRedis() {
    try {
        if (redis) {
            await redis.quit();
        }
    } catch (error) {
        console.error(
            "[REDIS SHUTDOWN ERROR]",
            error.message
        );
    }
}

function getRedisStatus() {
    return redis
        ? redis.status
        : "disabled";
}

module.exports =
    Object.freeze({
        redis,
        connectRedis,
        disconnectRedis,
        getRedisStatus
    });