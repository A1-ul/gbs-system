"use strict";

function validateId(
    id
) {

    if (
        typeof id !==
            "string" ||
        !id.trim()
    ) {

        return {

            success: false,

            message:
                "Valid exam id required"
        };
    }

    return {

        success: true
    };
}

module.exports =
    Object.freeze({

        validateId
    });