"use strict";

/*
=========================================
GBS ENTERPRISE AUDITLOG EVENTS
COMMONJS ONLY
=========================================
*/

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        console.log(
            "[AUDITLOG_EVENT]",
            {

                event:
                    String(eventName),

                payload,

                timestamp:
                    new Date()
                        .toISOString()
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