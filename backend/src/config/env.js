"use strict";

/*
====================================
DEPENDENCIES
====================================
*/

const dotenv =
    require(
        "dotenv"
    );

const {
    validateConfiguration
} =
    require(
        "./config.validator"
    );

/*
====================================
STATE
====================================
*/

let loaded =
    false;

let validated =
    false;

/*
====================================
LOAD ENV
====================================
*/

function loadEnv() {

    if (
        loaded
    ) {

        return true;
    }

    const result =
        dotenv.config();

    if (
        result.error
    ) {

        throw new Error(
            "Failed to load .env file"
        );
    }

    loaded =
        true;

    return true;
}

/*
====================================
VALIDATE ENV
====================================
*/

function validateEnv() {

    if (
        validated
    ) {

        return true;
    }

    loadEnv();

    validateConfiguration();

    validated =
        true;

    console.log(`

====================================
ENV VALIDATED
====================================

APP NAME : ${process.env.APP_NAME}

NODE_ENV : ${process.env.NODE_ENV}

PORT     : ${process.env.PORT}

====================================

`);

    return true;
}

/*
====================================
GET ENV
====================================
*/

function getEnv(
    key,
    fallback
) {

    if (
        typeof key !==
        "string"
    ) {

        return fallback;
    }

    return process.env[key] ??
        fallback;
}

/*
====================================
IS PRODUCTION
====================================
*/

function isProduction() {

    return (
        process.env.NODE_ENV ===
        "production"
    );
}

/*
====================================
IS DEVELOPMENT
====================================
*/

function isDevelopment() {

    return (
        process.env.NODE_ENV ===
        "development"
    );
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        loadEnv,

        validateEnv,

        getEnv,

        isProduction,

        isDevelopment
    });