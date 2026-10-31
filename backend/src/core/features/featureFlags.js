"use strict";

/*
====================================
FEATURE FLAGS
====================================
*/

const flags =
    Object.seal({

        REGISTRATION:
            true,

        EMAIL_NOTIFICATIONS:
            true,

        SMS_NOTIFICATIONS:
            false,

        ANALYTICS:
            true,

        FILE_UPLOADS:
            true,

        MULTI_TENANT:
            true,

        AUDIT_LOGGING:
            true,

        REALTIME_SOCKET:
            true,

        BACKUPS:
            true
    });

function getFlags() {

    return Object.freeze({
        ...flags
    });
}

function isEnabled(
    feature
) {

    return Boolean(
        flags[feature]
    );
}

module.exports =
    Object.freeze({

        getFlags,

        isEnabled
    });