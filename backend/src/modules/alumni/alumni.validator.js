"use strict";

/*
====================================
ALUMNI VALIDATOR
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

function validateId(
    id
) {

    const alumniId =
        Number(id);

    if (
        !Number.isInteger(
            alumniId
        )
    ) {

        return {

            success: false,

            message:
                "Alumni ID must be an integer"
        };
    }

    if (
        alumniId <= 0
    ) {

        return {

            success: false,

            message:
                "Alumni ID must be greater than zero"
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