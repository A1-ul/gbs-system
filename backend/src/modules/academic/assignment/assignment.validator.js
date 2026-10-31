"use strict";

function validateId(
    id
) {

    if (
        !id ||
        typeof id !== "string"
    ) {

        return {

            success: false,
            message:
                "Valid assignment id required"
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