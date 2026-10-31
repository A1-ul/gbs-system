"use strict";

/*
=========================================
ADMISSION VALIDATORS
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

function validateId(
    id
) {

    const numericId =
        Number(id);

    if (
        !Number.isInteger(
            numericId
        ) ||
        numericId <= 0
    ) {

        return Object.freeze({

            success: false,

            message:
                "Valid admission id required"
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