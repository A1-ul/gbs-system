"use strict";

/*
====================================
STAFF VALIDATOR
COMMONJS ONLY
====================================
*/

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
                "Valid staff id required"
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