"use strict";

/*
=========================================
ADMIN EVENTS
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const logger =
    require("../../utils/logger");

function emit(
    eventName,
    payload = {}
) {

    try {

        logger.info(
            eventName,
            {

                timestamp:
                    new Date()
                        .toISOString(),

                ...payload
            }
        );

        return true;

    } catch {

        return false;
    }
}

function adminLogin(
    payload
) {

    return emit(
        "ADMIN_LOGIN",
        payload
    );
}

function adminLogout(
    payload
) {

    return emit(
        "ADMIN_LOGOUT",
        payload
    );
}

function systemStatsViewed(
    payload
) {

    return emit(
        "SYSTEM_STATS_VIEWED",
        payload
    );
}

function systemHealthViewed(
    payload
) {

    return emit(
        "SYSTEM_HEALTH_VIEWED",
        payload
    );
}

module.exports =
    Object.freeze({

        adminLogin,

        adminLogout,

        systemStatsViewed,

        systemHealthViewed
    });