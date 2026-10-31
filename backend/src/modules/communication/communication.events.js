"use strict";

/*
==================================================
COMMUNICATION EVENTS
ENTERPRISE HARDENED
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

/*
==================================================
HELPERS
==================================================
*/

function buildEventPayload(
    eventName,
    payload = {}
) {

    return Object.freeze({

        event:
            String(eventName),

        timestamp:
            new Date()
                .toISOString(),

        payload:
            payload &&
            typeof payload === "object"
                ? payload
                : {}
    });
}

function logEvent(
    eventName,
    payload = {}
) {

    try {

        const eventData =
            buildEventPayload(
                eventName,
                payload
            );

        console.log(
            `[COMMUNICATION EVENT] ${eventName}`,
            JSON.stringify(
                eventData
            )
        );

        return true;

    } catch (error) {

        console.error(
            `[COMMUNICATION EVENT ERROR] ${eventName}`,
            error.message
        );

        return false;
    }
}

/*
==================================================
COMMUNICATION CREATED
==================================================
*/

function communicationCreated(
    payload = {}
) {

    return logEvent(
        "COMMUNICATION_CREATED",
        payload
    );
}

/*
==================================================
COMMUNICATION UPDATED
==================================================
*/

function communicationUpdated(
    payload = {}
) {

    return logEvent(
        "COMMUNICATION_UPDATED",
        payload
    );
}

/*
==================================================
COMMUNICATION DELETED
==================================================
*/

function communicationDeleted(
    payload = {}
) {

    return logEvent(
        "COMMUNICATION_DELETED",
        payload
    );
}

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        communicationCreated,
        communicationUpdated,
        communicationDeleted
    });