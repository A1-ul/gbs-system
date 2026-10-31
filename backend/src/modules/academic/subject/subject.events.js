"use strict";

const EventEmitter =
    require("events");

const emitter =
    new EventEmitter();

emitter.setMaxListeners(
    50
);

const EVENTS =
    Object.freeze({

        SUBJECT_CREATED:
            "subject.created",

        SUBJECT_UPDATED:
            "subject.updated",

        SUBJECT_DELETED:
            "subject.deleted"
    });

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        emitter.emit(
            eventName,
            Object.freeze({

                ...payload,

                timestamp:
                    new Date()
                        .toISOString()
            })
        );

        return true;

    } catch {

        return false;
    }
}

module.exports =
    Object.freeze({

        EVENTS,

        emitter,

        emitEvent
    });