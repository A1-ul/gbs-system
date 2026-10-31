"use strict";

const crypto =
    require("crypto");

let logger;

try {

    logger =
        require("../utils/logger");

} catch {

    logger = {

        info:
            console.log,

        warn:
            console.warn,

        error:
            console.error
    };
}

const SLOW_REQUEST_MS =
    5000;

function createRequestId(
    req
) {

    return (
        req.requestId ||
        req.id ||
        crypto.randomUUID()
    );
}

function safeLog(
    level,
    payload
) {

    try {

        if (
            logger &&
            typeof logger[level] ===
                "function"
        ) {

            logger[level](
                payload
            );

            return;
        }

        console.log(
            payload
        );

    } catch {

        console.log(
            payload
        );
    }
}

function requestLogger(
    req,
    res,
    next
) {

    try {

        const requestId =
            createRequestId(
                req
            );

        req.requestId =
            requestId;

        const startTime =
            process.hrtime.bigint();

        let completed =
            false;

        function logRequest() {

            try {

                if (
                    completed
                ) {

                    return;
                }

                completed =
                    true;

                const endTime =
                    process.hrtime.bigint();

                const durationMs =
                    Number(
                        endTime -
                        startTime
                    ) / 1000000;

                const payload = {

                    requestId,

                    timestamp:
                        new Date().toISOString(),

                    method:
                        req.method,

                    path:
                        req.originalUrl ||
                        req.url,

                    statusCode:
                        res.statusCode,

                    durationMs:
                        Math.round(
                            durationMs
                        ),

                    ip:
                        req.ip,

                    tenantId:
                        req.tenantId ||
                        null,

                    userId:
                        req.user?.id ||
                        null,

                    userAgent:
                        req.headers[
                            "user-agent"
                        ] || null
                };

                if (
                    durationMs >=
                    SLOW_REQUEST_MS
                ) {

                    safeLog(
                        "warn",
                        {

                            type:
                                "SLOW_REQUEST",

                            ...payload
                        }
                    );

                } else {

                    safeLog(
                        "info",
                        {

                            type:
                                "REQUEST",

                            ...payload
                        }
                    );
                }

            } catch (
                error
            ) {

                safeLog(
                    "error",
                    {

                        type:
                            "REQUEST_LOGGER_FAILURE",

                        message:
                            error.message
                    }
                );
            }
        }

        res.once(
            "finish",
            logRequest
        );

        res.once(
            "close",
            logRequest
        );

        return next();

    } catch (
        error
    ) {

        safeLog(
            "error",
            {

                type:
                    "REQUEST_LOGGER_FATAL",

                message:
                    error.message
            }
        );

        return next();
    }
}

module.exports =
    requestLogger;