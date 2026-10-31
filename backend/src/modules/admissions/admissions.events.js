"use strict";

/*
=========================================
ADMISSION EVENTS
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const logger =
    require("../../utils/logger");

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        logger.info(
            eventName,
            {

                timestamp:
                    new Date()
                        .toISOString(),

                ...payload
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