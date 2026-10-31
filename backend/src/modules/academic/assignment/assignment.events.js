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

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        logger.info(
            "ASSIGNMENT_EVENT",
            {
                event:
                    String(eventName),
                payload
            }
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