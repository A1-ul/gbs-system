"use strict";

/*
====================================
ROLE EVENTS
COMMONJS ONLY
====================================
*/

const EventEmitter =
    require("events");

const roleEvents =
    new EventEmitter();

/*
====================================
EVENT NAMES
====================================
*/

const EVENTS =
    Object.freeze({

        ROLE_CREATED:
            "role.created",

        ROLE_UPDATED:
            "role.updated",

        ROLE_DELETED:
            "role.deleted",

        ROLE_ASSIGNED:
            "role.assigned",

        ROLE_UNASSIGNED:
            "role.unassigned"
    });

/*
====================================
MAX LISTENERS
====================================
*/

roleEvents.setMaxListeners(
    50
);

/*
====================================
SAFE EMIT
====================================
*/

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        if (
            !eventName
        ) {

            return false;
        }

        roleEvents.emit(
            eventName,
            Object.freeze({
                ...payload,
                timestamp:
                    new Date()
                        .toISOString()
            })
        );

        return true;

    } catch (
        error
    ) {

        console.error(
            "ROLE EVENT ERROR:",
            error.message
        );

        return false;
    }
}

/*
====================================
SAFE LISTENER
====================================
*/

function registerListener(
    eventName,
    callback
) {

    try {

        if (
            !eventName ||
            typeof callback !==
                "function"
        ) {

            return false;
        }

        roleEvents.on(
            eventName,
            callback
        );

        return true;

    } catch (
        error
    ) {

        console.error(
            "ROLE LISTENER ERROR:",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        EVENTS,

        roleEvents,

        emitEvent,

        registerListener
    });