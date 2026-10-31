"use strict";

const logs = [];

const MAX_LOGS = 10000;

function write(
    level,
    message,
    meta = {}
) {

    const entry = {

        level:
            String(level || "INFO"),

        message:
            String(message || ""),

        meta,

        timestamp:
            new Date()
                .toISOString()
    };

    logs.push(entry);

    if (
        logs.length >
        MAX_LOGS
    ) {

        logs.shift();
    }

    return true;
}

function info(
    message,
    meta = {}
) {

    return write(
        "INFO",
        message,
        meta
    );
}

function warn(
    message,
    meta = {}
) {

    return write(
        "WARN",
        message,
        meta
    );
}

function error(
    message,
    meta = {}
) {

    return write(
        "ERROR",
        message,
        meta
    );
}

function getLogs() {

    return [...logs];
}

module.exports =
    Object.freeze({

        info,
        warn,
        error,
        getLogs
    });