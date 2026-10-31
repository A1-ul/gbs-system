"use strict";

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        console.log(
            `[CCTV EVENT] ${eventName}`,
            payload
        );

        return true;

    } catch (error) {

        console.error(
            "[CCTV EVENT ERROR]",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        emitEvent
    });