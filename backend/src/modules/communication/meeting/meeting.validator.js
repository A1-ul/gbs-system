"use strict";

function validateId(
    id
) {

    if (
        !id ||
        typeof id !== "string" ||
        !id.trim()
    ) {

        return {

            success: false,

            message:
                "Valid meeting id required"
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