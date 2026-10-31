"use strict";

const CONSTANTS =
    require(
        "./cache.constants"
    );

/*
====================================
CACHE STORE
====================================
*/

const cache =
    new Map();

/*
====================================
SET
====================================
*/

function set(
    key,
    value,
    ttl =
        CONSTANTS.DEFAULT_TTL
) {

    try {

        if (
            typeof key !==
            "string" ||
            !key.trim()
        ) {

            return false;
        }

        if (
            cache.size >=
            CONSTANTS.MAX_ENTRIES
        ) {

            const firstKey =
                cache.keys()
                    .next()
                    .value;

            cache.delete(
                firstKey
            );
        }

        cache.set(
            key,
            {

                value,

                createdAt:
                    Date.now(),

                expiresAt:
                    Date.now() +
                    ttl
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

function get(
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
HAS
====================================
*/

function has(
    key
) {

    return (
        get(
            key
        ) !== null
    );
}

/*
====================================
REMOVE
====================================
*/

function remove(
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

function clear() {

    cache.clear();

    return true;
}

/*
====================================
SIZE
====================================
*/

function size() {

    return cache.size;
}

/*
====================================
STATUS
====================================
*/

function getStatus() {

    return Object.freeze({

        entries:
            cache.size,

        maxEntries:
            CONSTANTS.MAX_ENTRIES,

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
====================================
CLEAN EXPIRED
====================================
*/

function cleanExpired() {

    let removed = 0;

    const now =
        Date.now();

    for (
        const [
            key,
            value
        ]
        of cache.entries()
    ) {

        if (
            now >
            value.expiresAt
        ) {

            cache.delete(
                key
            );

            removed++;
        }
    }

    return removed;
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        set,

        get,

        has,

        remove,

        clear,

        size,

        getStatus,

        cleanExpired
    });