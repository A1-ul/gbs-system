"use strict";

/*
=========================================
GBS ENTERPRISE AUDIT EVENTS
COMMONJS ONLY
=========================================
*/

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        console.log(
            "[AUDIT_EVENT]",
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