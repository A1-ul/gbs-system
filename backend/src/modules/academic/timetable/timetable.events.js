"use strict";

/*
====================================
TIMETABLE EVENTS
====================================
*/

const EVENTS =
    Object.freeze({

        TIMETABLE_CREATED:
            "timetable.created",

        TIMETABLE_UPDATED:
            "timetable.updated",

        TIMETABLE_DELETED:
            "timetable.deleted"
    });

/*
====================================
EVENT FACTORY
====================================
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

module.exports =
    Object.freeze({

        EVENTS,

        createEvent
    });