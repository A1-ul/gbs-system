"use strict";

/*
====================================
PRODUCTION VALIDATION
====================================
*/

const REQUIRED_ENV = [

    "DATABASE_URL",

    "JWT_SECRET",

    "JWT_REFRESH_SECRET"
];

/*
====================================
CHECK PRODUCTION
====================================
*/

function validateProduction() {

    const environment =
        process.env.NODE_ENV ||
        "development";

    const result = {

        valid: true,

        environment,

        missing: []
    };

    if (
        environment !==
        "production"
    ) {

        return result;
    }

    for (
        const variable
        of REQUIRED_ENV
    ) {

        if (
            !process.env[
                variable
            ]
        ) {

            result.valid =
                false;

            result.missing.push(
                variable
            );
        }
    }

    return result;
}

/*
====================================
ENFORCE
====================================
*/

function enforceProduction() {

    const validation =
        validateProduction();

    if (
        !validation.valid
    ) {

        throw new Error(

            `Production validation failed: ${validation.missing.join(", ")}`
        );
    }

    return true;
}

module.exports =
    Object.freeze({

        validateProduction,

        enforceProduction
    });