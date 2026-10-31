"use strict";

/*
====================================
MIDDLEWARE REGISTRY
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

module.exports =
    Object.freeze({

        authenticate:
            require(
                "./auth.middleware"
            ).authenticate,

        tenantMiddleware:
            require(
                "./tenant.middleware"
            ),

        rbacMiddleware:
            require(
                "./rbac.middleware"
            ),

        permissionMiddleware:
            require(
                "./permission.middleware"
            ),

        rateLimitMiddleware:
            require(
                "./rateLimit.middleware"
            ),

        validateMiddleware:
            require(
                "./validate.middleware"
            ),

        uploadMiddleware:
            require(
                "./upload.middleware"
            ),

        requestLogger:
            require(
                "./requestLogger.middleware"
            ),

        notFoundMiddleware:
            require(
                "./notFound.middleware"
            ),

        errorMiddleware:
            require(
                "./error.middleware"
            )
    });