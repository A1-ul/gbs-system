"use strict";

const EventEmitter =
    require("events");

const emitter =
    new EventEmitter();

emitter.setMaxListeners(50);

const EVENTS =
    Object.freeze({

        STUDENT_CREATED:
            "student.created",

        STUDENT_UPDATED:
            "student.updated",

        STUDENT_DELETED:
            "student.deleted",

        STUDENT_ENROLLED:
            "student.enrolled"
    });

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        emitter.emit(
            eventName,
            Object.freeze({

                payload,

                timestamp:
                    new Date()
                        .toISOString()
            })
        );

        return true;

    } catch (error) {

        console.error(
            "[STUDENT EVENT ERROR]",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        EVENTS,

        emitter,

        emitEvent
    });