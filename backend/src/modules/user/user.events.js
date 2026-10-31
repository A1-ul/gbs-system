"use strict";

const EVENTS = Object.freeze({

    USER_CREATED:
        "user.created",

    USER_UPDATED:
        "user.updated",

    USER_DELETED:
        "user.deleted",

    USER_ROLE_UPDATED:
        "user.role.updated",

    USER_PERMISSIONS_UPDATED:
        "user.permissions.updated",

    USER_LOGIN:
        "user.login",

    USER_LOGOUT:
        "user.logout"
});

function createEvent(
    event,
    payload = {}
) {

    return Object.freeze({

        event,

        payload,

        timestamp:
            new Date().toISOString()
    });
}

module.exports = Object.freeze({

    EVENTS,
    createEvent
});