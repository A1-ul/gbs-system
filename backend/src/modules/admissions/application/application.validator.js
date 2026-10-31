"use strict";

/*
==================================================
GBS ENTERPRISE APPLICATION VALIDATOR
COMMONJS ONLY
==================================================
*/

function validateId(
    id
) {

    const applicationId =
        Number(id);

    if (
        !Number.isInteger(
            applicationId
        ) ||
        applicationId <= 0
    ) {

        return {

            success: false,

            message:
                "Valid application id required"
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