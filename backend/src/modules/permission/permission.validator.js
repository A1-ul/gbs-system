"use strict";

function validatePermissionId(
    id
) {

    if (
        !id ||
        typeof id !== "string"
    ) {

        return {

            success: false,

            message:
                "Valid permission id required",

            data: null
        };
    }

    return {

        success: true
    };
}

module.exports =
    Object.freeze({

        validatePermissionId
    });