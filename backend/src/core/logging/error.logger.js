"use strict";

const errors = [];

function logError(
    error
) {

    errors.push({

        message:
            error &&
            error.message
                ? error.message
                : "Unknown Error",

        stack:
            error &&
            error.stack
                ? error.stack
                : null,

        timestamp:
            new Date()
                .toISOString()
    });

    return true;
}

function getErrors() {

    return [...errors];
}

module.exports =
    Object.freeze({

        logError,

        getErrors
    });