"use strict";

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        console.log(
            `[PARENT EVENT] ${eventName}`,
            payload
        );

        return true;

    } catch (error) {

        console.error(
            "PARENT EVENT ERROR:",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({
        emitEvent
    });