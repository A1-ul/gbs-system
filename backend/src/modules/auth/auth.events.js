"use strict";

/*
=================================================
AUTH EVENTS
=================================================
*/

const EVENTS = Object.freeze({

    USER_REGISTERED:
        "auth.user_registered",

    USER_LOGGED_IN:
        "auth.user_logged_in",

    USER_LOGGED_OUT:
        "auth.user_logged_out",

    TOKEN_REFRESHED:
        "auth.token_refreshed",

    PASSWORD_CHANGED:
        "auth.password_changed",

    PROFILE_VIEWED:
        "auth.profile_viewed"
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

module.exports =
    Object.freeze({

        EVENTS,

        createEvent
    });