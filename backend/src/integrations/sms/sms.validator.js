"use strict";

function validateSMS(
    payload = {}
) {

    const errors = [];

    if (
        !payload.phone
    ) {

        errors.push(
            "Phone number required"
        );
    }

    if (
        !payload.message
    ) {

        errors.push(
            "Message required"
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

        validateSMS
    });