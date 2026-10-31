"use strict";

/*
====================================
MEMORY CACHE FALLBACK
====================================
*/

const cache =
    new Map();

let connected =
    false;

let initialized =
    false;

/*
====================================
CONNECT
====================================
*/

async function connectRedis() {

    try {

        if (
            initialized
        ) {

            return true;
        }

        connected =
            true;

        initialized =
            true;

        console.log(`

====================================
CACHE INITIALIZED
====================================

MODE : MEMORY CACHE

====================================

`);

        return true;

    } catch (
        error
    ) {

        connected =
            false;

        console.error(
            error.message
        );

        return false;
    }
}

/*
====================================
DISCONNECT
====================================
*/

async function disconnectRedis() {

    cache.clear();

    connected =
        false;

    initialized =
        false;

    return true;
}

/*
====================================
SET
====================================
*/

async function setCache(
    key,
    value,
    ttlSeconds = 300
) {

    try {

        if (
            !connected
        ) {

            await connectRedis();
        }

        const expiresAt =
            Date.now() +
            (
                ttlSeconds *
                1000
            );

        cache.set(

            key,

            {
                value,
                expiresAt
            }
        );

        return true;

    } catch {

        return false;
    }
}

/*
====================================
GET
====================================
*/

async function getCache(
    key
) {

    try {

        const item =
            cache.get(
                key
            );

        if (
            !item
        ) {

            return null;
        }

        if (
            Date.now() >
            item.expiresAt
        ) {

            cache.delete(
                key
            );

            return null;
        }

        return item.value;

    } catch {

        return null;
    }
}

/*
====================================
DELETE
====================================
*/

async function deleteCache(
    key
) {

    return cache.delete(
        key
    );
}

/*
====================================
CLEAR
====================================
*/

async function clearCache() {

    cache.clear();

    return true;
}

/*
====================================
STATUS
====================================
*/

function getRedisStatus() {

    return Object.freeze({

        initialized,

        connected,

        entries:
            cache.size
    });
}

/*
====================================
CONNECTED
====================================
*/

function isRedisConnected() {

    return connected;
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        connectRedis,

        disconnectRedis,

        setCache,

        getCache,

        deleteCache,

        clearCache,

        getRedisStatus,

        isRedisConnected
    });