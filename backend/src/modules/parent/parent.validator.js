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
                "Valid parent id required"
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