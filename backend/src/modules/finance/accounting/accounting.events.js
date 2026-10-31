"use strict";

/*
=========================================
ACCOUNTANT EVENTS
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const logger =
    require("../../../utils/logger");

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        if (
            typeof eventName !==
            "string"
        ) {

            return false;
        }

        logger.info(
            "ACCOUNTANT_EVENT",
            {

                event:
                    eventName,

                payload,

                timestamp:
                    new Date().toISOString()
            }
        );

        return true;

    } catch (error) {

        logger.error(
            "ACCOUNTANT_EVENT_FAILURE",
            {

                event:
                    eventName,

                message:
                    error.message
            }
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        emitEvent
    });