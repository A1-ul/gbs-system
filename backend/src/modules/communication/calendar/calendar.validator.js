"use strict";

function validateId(
    id
) {

    if (
        !id ||
        typeof id !== "string" ||
        !id.trim()
    ) {

        return Object.freeze({

            success: false,

            message:
                "Valid calendar id required"
        });
    }

    return Object.freeze({

        success: true
    });
}

module.exports =
    Object.freeze({

        validateId
    });