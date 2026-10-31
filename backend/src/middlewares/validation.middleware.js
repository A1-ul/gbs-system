"use strict";

/*
=========================================
GBS ENTERPRISE VALIDATION MIDDLEWARE
CRASH SAFE • COMMONJS ONLY • PRODUCTION READY
=========================================
*/

const { validationResult } = require("express-validator");
const logger = require("../utils/logger");

function validateMiddleware(req, res, next) {

    try {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            const formattedErrors = errors.array({
                onlyFirstError: true
            });

            logger.warn("VALIDATION_FAILED", {
                route: req.originalUrl,
                method: req.method,
                errors: formattedErrors
            });

            return res.status(400).json({
                success: false,
                error: "VALIDATION_FAILED",
                message: "Validation failed",
                errors: formattedErrors,
                timestamp: new Date().toISOString()
            });
        }

        return next();

    } catch (error) {

        logger.error("VALIDATION_MIDDLEWARE_FAILURE", {
            message: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            success: false,
            error: "VALIDATION_SYSTEM_FAILURE",
            message: "Validation system error"
        });
    }
}

module.exports = validateMiddleware;