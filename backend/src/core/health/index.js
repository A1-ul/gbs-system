"use strict";

const checkDatabase =
    require(
        "./database.health"
    );

const checkRedis =
    require(
        "./redis.health"
    );

const checkQueue =
    require(
        "./queue.health"
    );

const checkStorage =
    require(
        "./storage.health"
    );

async function getSystemHealth() {

    const database =
        await checkDatabase();

    const redis =
        await checkRedis();

    const queue =
        await checkQueue();

    const storage =
        await checkStorage();

    const healthy =

        database.healthy &&
        redis.healthy &&
        queue.healthy &&
        storage.healthy;

    return {

        healthy,

        timestamp:
            new Date()
                .toISOString(),

        services: {

            database,

            redis,

            queue,

            storage
        }
    };
}

module.exports =
    Object.freeze({

        getSystemHealth
    });