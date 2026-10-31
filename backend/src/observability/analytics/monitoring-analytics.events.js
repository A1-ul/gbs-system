"use strict";

/*
=========================================
GBS ENTERPRISE ANALYTICS EVENTS
COMMONJS ONLY
=========================================
*/

let logger;

try {

    logger =
        require("../../utils/logger");

} catch {

    logger = {

        info: console.log,
        warn: console.warn,
        error: console.error
    };
}

function emit(
    event,
    payload = {}
) {

    try {

        logger.info(
            "ANALYTICS_EVENT",
            {
                event,
                payload
            }
        );

        return true;

    } catch {

        return false;
    }
}

module.exports =
    Object.freeze({

        analyticsGenerated:
            payload =>
                emit(
                    "ANALYTICS_GENERATED",
                    payload
                ),

        dashboardViewed:
            payload =>
                emit(
                    "DASHBOARD_VIEWED",
                    payload
                ),

        reportExported:
            payload =>
                emit(
                    "REPORT_EXPORTED",
                    payload
                ),

        metricsCalculated:
            payload =>
                emit(
                    "METRICS_CALCULATED",
                    payload
                )
    });