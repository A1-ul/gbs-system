"use strict";

const alerts = [];

const MAX_ALERTS =
    5000;

function createAlert(
    level,
    message,
    metadata = {}
) {

    alerts.push({

        level:
            String(
                level || "INFO"
            ),

        message:
            String(
                message || ""
            ),

        metadata,

        timestamp:
            new Date()
                .toISOString()
    });

    if (
        alerts.length >
        MAX_ALERTS
    ) {

        alerts.shift();
    }

    return true;
}

function getAlerts() {

    return [...alerts];
}

function clearAlerts() {

    alerts.length = 0;

    return true;
}

module.exports =
    Object.freeze({

        createAlert,

        getAlerts,

        clearAlerts
    });