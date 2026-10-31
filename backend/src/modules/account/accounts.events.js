"use strict";

/*
=================================================
GBS ENTERPRISE ACADEMIC EVENTS
COMMONJS ONLY
PRODUCTION READY
=================================================
*/

const EVENTS = Object.freeze({

    ACADEMIC_CREATED:
        "ACADEMIC_CREATED",

    ACADEMIC_UPDATED:
        "ACADEMIC_UPDATED",

    ACADEMIC_DELETED:
        "ACADEMIC_DELETED",

    ACADEMIC_ARCHIVED:
        "ACADEMIC_ARCHIVED",

    ACADEMIC_PUBLISHED:
        "ACADEMIC_PUBLISHED"
});

function createEvent(
    event,
    payload = {}
) {

    return Object.freeze({

        event,

        payload,

        timestamp:
            new Date().toISOString()
    });
}

module.exports =
    Object.freeze({

        EVENTS,

        createEvent
    });