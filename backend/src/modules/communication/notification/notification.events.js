"use strict";

function safeLog(
    event,
    payload
) {

    try {

        console.log(
            `[NOTIFICATION EVENT] ${event}`,
            payload || {}
        );

        return true;

    } catch {

        return false;
    }
}

function notificationCreated(
    payload
) {

    return safeLog(
        "CREATED",
        payload
    );
}

function notificationUpdated(
    payload
) {

    return safeLog(
        "UPDATED",
        payload
    );
}

function notificationDeleted(
    payload
) {

    return safeLog(
        "DELETED",
        payload
    );
}

module.exports =
    Object.freeze({
        notificationCreated,
        notificationUpdated,
        notificationDeleted
    });