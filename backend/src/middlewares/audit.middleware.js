"use strict";

/*
====================================
AUDIT MIDDLEWARE
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

const logger =
    require("../utils/logger");

function auditMiddleware(
    req,
    res,
    next
) {

    try {

        const auditRecord = {

            timestamp:
                new Date()
                    .toISOString(),

            requestId:
                req.requestId ||

                null,

            method:
                req.method ||

                null,

            route:
                req.originalUrl ||

                null,

            userId:
                req.user?.id ||

                null,

            role:
                req.user?.role ||

                null,

            tenantId:
                req.tenantId ||

                req.user?.tenantId ||

                null,

            ip:
                req.ip ||

                req.socket?.remoteAddress ||

                null,

            userAgent:
                req.headers[
                    "user-agent"
                ] ||

                null
        };

        logger.info(
            "AUDIT_EVENT",
            auditRecord
        );

        return next();

    } catch (
        error
    ) {

        logger.error(
            "AUDIT_MIDDLEWARE_FAILURE",
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
        auditMiddleware
    );