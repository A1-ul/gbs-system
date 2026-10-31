"use strict";

/*
=========================================
GBS ENTERPRISE SANITIZER
COMMONJS ONLY
CRASH SAFE
PROTOTYPE POLLUTION SAFE
=========================================
*/

const logger =
    require("../utils/logger");

const BLOCKED_KEYS =
    new Set([
        "__proto__",
        "prototype",
        "constructor"
    ]);

function sanitizeObject(obj) {

    if (
        !obj ||
        typeof obj !== "object"
    ) {

        return;
    }

    for (
        const key of Object.keys(obj)
    ) {

        if (
            BLOCKED_KEYS.has(key)
        ) {

            delete obj[key];

            continue;
        }

        const value =
            obj[key];

        if (
            typeof value === "string"
        ) {

            obj[key] =
                value.trim();
        }

        else if (
            Array.isArray(value)
        ) {

            for (
                const item of value
            ) {

                sanitizeObject(item);
            }
        }

        else if (
            value &&
            typeof value === "object"
        ) {

            sanitizeObject(value);
        }
    }
}

function sanitizeMiddleware(
    req,
    res,
    next
) {

    try {

        sanitizeObject(req.body);

        sanitizeObject(req.query);

        sanitizeObject(req.params);

        return next();

    } catch (error) {

        logger.error(
            "SANITIZER_FAILURE",
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
    sanitizeMiddleware;