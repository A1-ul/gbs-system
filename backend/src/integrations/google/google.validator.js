"use strict";

function validateMeeting(
    payload = {}
) {

    const errors =
        [];

    if (
        !payload.title
    ) {

        errors.push(
            "Meeting title required"
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