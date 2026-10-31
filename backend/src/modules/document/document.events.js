"use strict";

/*
==================================================
DOCUMENT EVENTS
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

            "[DOCUMENT EVENT]",

            eventName,

            payload
        );

        return true;

    } catch (error) {

        console.error(

            "[DOCUMENT EVENT ERROR]",

            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        emitEvent
    });