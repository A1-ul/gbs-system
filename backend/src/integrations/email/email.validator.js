"use strict";

function validateEmailPayload(
    payload = {}
) {

    const errors =
        [];

    if (
        !payload.to
    ) {

        errors.push(
            "Recipient required"
        );
    }

    if (
        !payload.subject
    ) {

        errors.push(
            "Subject required"
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

        validateEmailPayload
    });