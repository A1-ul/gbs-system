"use strict";

/*
=========================================
GBS ENTERPRISE TENANT MIDDLEWARE
COMMONJS ONLY
CRASH SAFE
=========================================
*/

const logger =
    require("../utils/logger");

function tenantMiddleware(
    req,
    res,
    next
) {

    try {

        if (
            !req.user ||
            typeof req.user !== "object"
        ) {

            return res.status(401).json({

                success: false,

                error:
                    "AUTH_REQUIRED",

                message:
                    "Authentication required",

                timestamp:
                    new Date().toISOString()
            });
        }

        const tenantId =
            Number(
                req.user.tenantId
            );

        if (
            !Number.isInteger(
                tenantId
            ) ||
            tenantId <= 0
        ) {

            logger.warn(
                "TENANT_ACCESS_DENIED",
                {
                    userId:
                        req.user.id || null,
                    tenantId:
                        req.user.tenantId || null,
                    path:
                        req.originalUrl
                }
            );

            return res.status(403).json({

                success: false,

                error:
                    "TENANT_ACCESS_DENIED",

                message:
                    "Tenant access denied",

                timestamp:
                    new Date().toISOString()
            });
        }

        req.tenantId =
            tenantId;

        return next();

    } catch (error) {

        logger.error(
            "TENANT_MIDDLEWARE_FAILURE",
            {
                message:
                    error.message,
                stack:
                    error.stack
            }
        );

        return next(error);
    }
}

module.exports =
    tenantMiddleware;