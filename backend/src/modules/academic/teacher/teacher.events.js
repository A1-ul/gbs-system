"use strict";

/*
=========================================
TEACHER EVENTS
ENTERPRISE HARDENED
COMMONJS ONLY
=========================================
*/

/*
=========================================
COMMONJS PROTECTION
=========================================
*/

if (
    typeof module ===
    "undefined"
) {

    throw new Error(
        "CommonJS environment required"
    );
}

/*
=========================================
EVENT CONSTANTS
=========================================
*/

const EVENTS =
    Object.freeze({

        TEACHER_CREATED:
            "teacher.created",

        TEACHER_UPDATED:
            "teacher.updated",

        TEACHER_DELETED:
            "teacher.deleted",

        TEACHER_ASSIGNED:
            "teacher.assigned",

        TEACHER_UNASSIGNED:
            "teacher.unassigned"
    });

/*
=========================================
SAFE EVENT CREATOR
=========================================
*/

function createEvent(
    event,
    payload = {}
) {

    try {

        return Object.freeze({

            event:
                typeof event ===
                "string"

                    ? event

                    : "teacher.unknown",

            payload:

                payload &&
                typeof payload ===
                    "object"

                    ? payload

                    : {},

            source:
                "teacher",

            timestamp:
                new Date()
                    .toISOString()
        });

    } catch {

        return Object.freeze({

            event:
                "teacher.error",

            payload: {},

            source:
                "teacher",

            timestamp:
                new Date()
                    .toISOString()
        });
    }
}

/*
=========================================
HELPERS
=========================================
*/

function teacherCreated(
    payload = {}
) {

    return createEvent(
        EVENTS.TEACHER_CREATED,
        payload
    );
}

function teacherUpdated(
    payload = {}
) {

    return createEvent(
        EVENTS.TEACHER_UPDATED,
        payload
    );
}

function teacherDeleted(
    payload = {}
) {

    return createEvent(
        EVENTS.TEACHER_DELETED,
        payload
    );
}

function teacherAssigned(
    payload = {}
) {

    return createEvent(
        EVENTS.TEACHER_ASSIGNED,
        payload
    );
}

function teacherUnassigned(
    payload = {}
) {

    return createEvent(
        EVENTS.TEACHER_UNASSIGNED,
        payload
    );
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        EVENTS,

        createEvent,

        teacherCreated,

        teacherUpdated,

        teacherDeleted,

        teacherAssigned,

        teacherUnassigned
    });