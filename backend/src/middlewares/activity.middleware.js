"use strict";

/*
====================================
ACTIVITY MIDDLEWARE
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

const logger =
    require("../utils/logger");

function activityMiddleware(
    req,
    res,
    next
) {

    try {

        const startTime =
            process.hrtime.bigint();

        const requestId =
            req.requestId ||
            "unknown";

        res.once(
            "finish",
            function () {

                try {

                    const endTime =
                        process.hrtime.bigint();

                    const durationMs =
                        Number(
                            endTime -
                            startTime
                        ) / 1000000;

                    logger.info(
                        "REQUEST_ACTIVITY",
                        {

                            requestId,

                            method:
                                req.method,

                            path:
                                req.originalUrl,

                            statusCode:
                                res.statusCode,

                            durationMs:
                                Number(
                                    durationMs.toFixed(2)
                                ),

                            ip:
                                req.ip ||

                                req.socket?.remoteAddress ||

                                "unknown"
                        }
                    );

                } catch (
                    error
                ) {

                    logger.error(
                        "ACTIVITY_LOG_FAILURE",
                        {
                            message:
                                error.message
                        }
                    );
                }
            }
        );

        return next();

    } catch (
        error
    ) {

        logger.error(
            "ACTIVITY_MIDDLEWARE_FAILURE",
            {
                message:
                    error.message
            }
        );

        return next();
    }
}

module.exports =
    Object.freeze(
        activityMiddleware
    );