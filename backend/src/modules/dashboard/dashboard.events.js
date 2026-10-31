"use strict";

/*
==================================================
DASHBOARD EVENTS
ENTERPRISE HARDENED
COMMONJS ONLY
==================================================
*/

function emitEvent(
    eventName,
    payload = {}
) {

    try {

        if (
            typeof eventName !== "string" ||
            !eventName.trim()
        ) {

            return false;
        }

        console.log(

            "[DASHBOARD EVENT]",

            eventName,

            payload
        );

        return true;

    } catch (error) {

        console.error(
            "[DASHBOARD EVENT ERROR]",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        emitEvent
    });