"use strict";

function validateCreate(
    payload = {}
) {

    const errors = [];

    if (
        !payload.name ||
        typeof payload.name !== "string" ||
        !payload.name.trim()
    ) {

        errors.push(
            "Classroom name is required"
        );
    }

    return Object.freeze({

        valid:
            errors.length === 0,

        errors
    });
}

function validateUpdate(
    payload = {}
) {

    return validateCreate(
        payload
    );
}

module.exports =
    Object.freeze({

        validateCreate,
        validateUpdate
    });