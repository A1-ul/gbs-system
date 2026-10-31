"use strict";

let logger;

try {

    logger =
        require("../../../utils/logger");

} catch {

    logger = {

        info: console.log,
        warn: console.warn,
        error: console.error
    };
}

const EVENTS =
    Object.freeze({

        ATTENDANCE_CREATED:
            "attendance.created",

        ATTENDANCE_UPDATED:
            "attendance.updated",

        ATTENDANCE_DELETED:
            "attendance.deleted",

        ATTENDANCE_MARKED:
            "attendance.marked",

        ATTENDANCE_APPROVED:
            "attendance.approved"
    });

function createEvent(
    event,
    payload = {}
) {

    try {

        const eventObject =
            Object.freeze({

                event,

                payload,

                timestamp:
                    new Date()
                        .toISOString()
            });

        logger.info(
            "ATTENDANCE_EVENT",
            eventObject
        );

        return eventObject;

    } catch (error) {

        logger.error(
            "ATTENDANCE_EVENT_FAILURE",
            {
                message:
                    error.message
            }
        );

        return null;
    }
}

module.exports =
    Object.freeze({

        EVENTS,

        createEvent
    });