"use strict";

const securityEvents = [];

function logSecurityEvent(
    event,
    metadata = {}
) {

    securityEvents.push({

        event,

        metadata,

        timestamp:
            new Date()
                .toISOString()
    });

    return true;
}

function getSecurityEvents() {

    return [...securityEvents];
}

module.exports =
    Object.freeze({

        logSecurityEvent,

        getSecurityEvents
    });