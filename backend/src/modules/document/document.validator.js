"use strict";

/*
==================================================
DOCUMENT VALIDATOR
ENTERPRISE HARDENED
COMMONJS ONLY
==================================================
*/

function validateId(
    id
) {

    if (

        typeof id !== "string" ||

        !id.trim()

    ) {

        return Object.freeze({

            success: false,

            message:
                "Valid document id required"
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