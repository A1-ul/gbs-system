"use strict";

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        console.log(
            "[MONITORING EVENT]",
            eventName,
            payload
        );

        return true;

    } catch {

        return false;
    }
}

module.exports =
    Object.freeze({

        emitEvent
    });