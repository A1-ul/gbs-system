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

function createRequestId(
    req
) {

    return (
        req.requestId ||
        req.id ||
        crypto.randomUUID()
    );
}

function buildResponse(
    req,
    requestId
) {

    return Object.freeze({

        success:
            false,

        requestId,

        error: {

            code:
                "ROUTE_NOT_FOUND",

            message:
                "Route Not Found"
        },

        route: {

            path:
                req.originalUrl ||
                req.url ||
                "",

            method:
                req.method ||
                "UNKNOWN"
        },

        timestamp:
            new Date().toISOString()
    });
}

function logNotFound(
    req,
    requestId
) {

    try {

        logger.warn(
            "ROUTE_NOT_FOUND",
            {

                requestId,

                path:
                    req.originalUrl,

                method:
                    req.method,

                ip:
                    req.ip,

                tenantId:
                    req.tenantId ||
                    null,

                userId:
                    req.user?.id ||
                    null
            }
        );

    } catch {

        /* silent */
    }
}

function notFoundMiddleware(
    req,
    res,
    next
) {

    try {

        if (
            res.headersSent
        ) {

            return next();
        }

        const requestId =
            createRequestId(
                req
            );

        logNotFound(
            req,
            requestId
        );

        return res
            .status(404)
            .json(
                buildResponse(
                    req,
                    requestId
                )
            );

    } catch (
        error
    ) {

        try {

            logger.error(
                "NOT_FOUND_MIDDLEWARE_FAILURE",
                {

                    message:
                        error.message,

                    stack:
                        error.stack
                }
            );

        } catch {

            console.error(
                error
            );
        }

        if (
            !res.headersSent
        ) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "ROUTE_NOT_FOUND",

                        message:
                            "Route Not Found"
                    },

                    timestamp:
                        new Date().toISOString()
                });
        }

        return next(error);
    }
}

module.exports =
    notFoundMiddleware;