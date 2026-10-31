"use strict";

function validateCreate(
    payload = {}
) {

    const errors = [];

    if (

        !payload.name ||

        typeof payload.name !==
            "string"

    ) {

        errors.push(
            "Grade name required"
        );
    }

    if (

        payload.score ===
            undefined ||

        payload.score === null ||

        Number.isNaN(
            Number(
                payload.score
            )
        )

    ) {

        errors.push(
            "Score must be numeric"
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