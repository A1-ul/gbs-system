"use strict";

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        console.log(
            `[CALENDAR EVENT] ${eventName}`,
            payload
        );

        return true;

    } catch (error) {

        console.error(
            "[CALENDAR EVENT ERROR]",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        emitEvent
    });