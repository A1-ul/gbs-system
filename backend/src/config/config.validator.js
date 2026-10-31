"use strict";

/*
====================================
DEPENDENCIES
====================================
*/

const schema =
    require(
        "./config.schema"
    );

/*
====================================
VALIDATE REQUIRED
====================================
*/

function validateRequired() {

    const missing =
        [];

    for (
        const key of
        schema.required
    ) {

        if (
            !process.env[key] ||
            !String(
                process.env[key]
            ).trim()
        ) {

            missing.push(
                key
            );
        }
    }

    if (
        missing.length
    ) {

        throw new Error(
            `Missing ENV variables: ${missing.join(", ")}`
        );
    }

    return true;
}

/*
====================================
APPLY DEFAULTS
====================================
*/

function applyDefaults() {

    Object.keys(
        schema.defaults
    ).forEach(
        function (
            key
        ) {

            if (
                !process.env[key]
            ) {

                process.env[key] =
                    schema.defaults[
                        key
                    ];
            }
        }
    );
}

/*
====================================
VALIDATE NODE ENV
====================================
*/

function validateNodeEnvironment() {

    const value =
        process.env.NODE_ENV;

    if (
        !schema.allowedNodeEnvironments.includes(
            value
        )
    ) {

        throw new Error(
            `Invalid NODE_ENV: ${value}`
        );
    }

    return true;
}

/*
====================================
VALIDATE PORT
====================================
*/

function validatePort() {

    const port =
        Number(
            process.env.PORT
        );

    if (
        Number.isNaN(
            port
        ) ||
        port < 1 ||
        port > 65535
    ) {

        throw new Error(
            "Invalid PORT value"
        );
    }

    return true;
}

/*
====================================
MASTER VALIDATOR
====================================
*/

function validateConfiguration() {

    applyDefaults();

    validateRequired();

    validateNodeEnvironment();

    validatePort();

    return true;
}

module.exports =
    Object.freeze({

        validateConfiguration,

        validateRequired,

        validateNodeEnvironment,

        validatePort,

        applyDefaults
    });