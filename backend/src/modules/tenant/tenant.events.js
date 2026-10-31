"use strict";

/*
=========================================
COMMONJS ONLY PROTECTION
=========================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "CommonJS environment required"
    );
}

/*
=========================================
TENANT EVENTS
=========================================
*/

const EVENTS =
    Object.freeze({

        TENANT_CREATED:
            "tenant.created",

        TENANT_UPDATED:
            "tenant.updated",

        TENANT_DELETED:
            "tenant.deleted",

        TENANT_ACTIVATED:
            "tenant.activated",

        TENANT_DEACTIVATED:
            "tenant.deactivated"
    });

/*
=========================================
EVENT FACTORY
=========================================
*/

function createEvent(
    event,
    payload = {}
) {

    return Object.freeze({

        event,

        payload,

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        EVENTS,

        createEvent
    });