"use strict";

/*
==================================================
GBS ENTERPRISE ERROR MIDDLEWARE
CRASH SAFE • PRODUCTION HARDENED • STABLE OUTPUT
==================================================
*/

const crypto = require("crypto");

/*
==================================================
LOGGER (SAFE FALLBACK)
==================================================
*/
let logger;

try {
    logger = require("../utils/logger");
} catch {
    logger = {
        info: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args)
    };
}

/*
==================================================
REQUEST ID GENERATOR
==================================================
*/
function getRequestId(req) {
    try {
        return (
            req?.requestId ||
            req?.id ||
            crypto.randomUUID()
        );
    } catch {
        return `req-${Date.now()}`;
    }
}

/*
==================================================
SAFE LOGGER
==================================================
*/
function safeLog(payload) {
    try {
        logger.error(payload);
    } catch {
        console.error(payload);
    }
}

/*
==================================================
ERROR NORMALIZER (STRICT + SAFE)
==================================================
*/
function normalizeError(error) {
    try {
        if (!error) {
            return {
                statusCode: 500,
                code: "UNKNOWN_ERROR",
                message: "Unknown error"
            };
        }

        if (!(error instanceof Error)) {
            return {
                statusCode: 500,
                code: "NON_ERROR_THROWN",
                message: String(error)
            };
        }

        const normalized = {
            statusCode: Number(error.statusCode || error.status || 500),
            code: error.code || error.name || "INTERNAL_SERVER_ERROR",
            message: error.message || "Internal Server Error",
            stack: error.stack || null
        };

        /*
        ==========================
        DATABASE ERRORS (PRISMA)
        ==========================
        */
        if (error.code === "P2002") {
            normalized.statusCode = 409;
            normalized.code = "DUPLICATE_RECORD";
            normalized.message = "Duplicate record detected";
        }

        if (error.code === "P2025") {
            normalized.statusCode = 404;
            normalized.code = "RECORD_NOT_FOUND";
            normalized.message = "Record not found";
        }

        /*
        ==========================
        AUTH ERRORS (JWT)
        ==========================
        */
        if (error.name === "TokenExpiredError") {
            normalized.statusCode = 401;
            normalized.code = "TOKEN_EXPIRED";
            normalized.message = "Token expired";
        }

        if (error.name === "JsonWebTokenError") {
            normalized.statusCode = 401;
            normalized.code = "TOKEN_INVALID";
            normalized.message = "Invalid token";
        }

        /*
        ==========================
        UPLOAD ERRORS
        ==========================
        */
        if (error.name === "MulterError") {
            normalized.statusCode = 400;
            normalized.code = "UPLOAD_ERROR";
            normalized.message = "File upload failed";
        }

        /*
        ==========================
        JSON PARSE ERROR
        ==========================
        */
        if (error.type === "entity.parse.failed") {
            normalized.statusCode = 400;
            normalized.code = "INVALID_JSON";
            normalized.message = "Invalid JSON payload";
        }

        /*
        ==========================
        VALIDATION ERRORS
        ==========================
        */
        if (error.name === "ValidationError") {
            normalized.statusCode = 400;
            normalized.code = "VALIDATION_ERROR";
        }

        /*
        ==========================
        SAFETY BOUNDARY CHECK
        ==========================
        */
        if (normalized.statusCode < 400 || normalized.statusCode > 599) {
            normalized.statusCode = 500;
        }

        return normalized;

    } catch (err) {
        return {
            statusCode: 500,
            code: "NORMALIZER_FAILED",
            message: "Error normalization failed"
        };
    }
}

/*
==================================================
ERROR MIDDLEWARE
==================================================
*/
function errorMiddleware(error, req, res, next) {
    try {
        if (res.headersSent) {
            return next(error);
        }

        const requestId = getRequestId(req);
        const normalized = normalizeError(error);

        safeLog({
            type: "REQUEST_ERROR",
            requestId,
            timestamp: new Date().toISOString(),
            method: req?.method || null,
            path: req?.originalUrl || null,
            ip: req?.ip || null,
            userId: req?.user?.id || null,
            tenantId: req?.tenantId || null,
            statusCode: normalized.statusCode,
            errorCode: normalized.code,
            message: normalized.message
        });

        const isProduction = process.env.NODE_ENV === "production";

        return res.status(normalized.statusCode).json({
            success: false,
            requestId,
            error: {
                code: normalized.code,
                message:
                    isProduction && normalized.statusCode >= 500
                        ? "Internal Server Error"
                        : normalized.message
            },
            timestamp: new Date().toISOString()
        });

    } catch (fatal) {
        console.error("[FATAL_ERROR_MIDDLEWARE]", fatal);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                error: {
                    code: "FATAL_ERROR",
                    message: "Critical server failure"
                },
                timestamp: new Date().toISOString()
            });
        }

        return next(fatal);
    }
}

/*
==================================================
EXPORT
==================================================
*/
module.exports = errorMiddleware;