"use strict";

/*
====================================
ZOOM VALIDATOR
====================================
*/

function validateMeeting(
    payload = {}
) {

    const errors = [];

    if (
        !payload.topic
    ) {

        errors.push(
            "Meeting topic required"
        );
    }

    if (
        !payload.startTime
    ) {

        errors.push(
            "Start time required"
        );
    }

    return {

        valid:
            errors.length === 0,

        errors
    };
}

module.exports =
    Object.freeze({

        validateMeeting
    });