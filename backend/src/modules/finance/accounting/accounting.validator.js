"use strict";

/*
=========================================
ACCOUNTANT VALIDATOR
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

function validateId(
    id
) {

    const parsedId =
        Number(id);

    if (
        !Number.isInteger(
            parsedId
        ) ||
        parsedId <= 0
    ) {

        return Object.freeze({

            success: false,

            message:
                "Valid accountant ID required"
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