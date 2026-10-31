"use strict";

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        console.log(
            `[MEETING EVENT] ${eventName}`,
            Object.freeze({
                ...payload
            })
        );

        return true;

    } catch (error) {

        console.error(
            "[MEETING EVENT ERROR]",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        emitEvent
    });