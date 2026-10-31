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
                "Valid audit log id required"
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