"use strict";

const cache =
    new Map();

/*
====================================
SET
====================================
*/

function setTenantCache(
    tenantId,
    data
) {

    cache.set(
        tenantId,
        {

            data,

            timestamp:
                Date.now()
        }
    );

    return true;
}

/*
====================================
GET
====================================
*/

function getTenantCache(
    tenantId
) {

    const item =
        cache.get(
            tenantId
        );

    return item
        ? item.data
        : null;
}

/*
====================================
CLEAR
====================================
*/

function clearTenantCache(
    tenantId
) {

    return cache.delete(
        tenantId
    );
}

module.exports =
    Object.freeze({

        setTenantCache,

        getTenantCache,

        clearTenantCache
    });