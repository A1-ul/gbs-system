"use strict";

/*
==================================================
GBS ENTERPRISE RATE LIMIT MIDDLEWARE
CRASH SAFE • PRODUCTION READY
==================================================
*/

const rateLimit = require("express-rate-limit");

/*
==================================================
SAFE ENV CHECK
==================================================
*/

const isDev = process.env.NODE_ENV === "development";

/*
==================================================
RATE LIMIT CONFIG
==================================================
*/

const apiLimiter = rateLimit({

    windowMs: 15 * 60 * 1000, // 15 minutes

    /*
    ------------------------------------------
    SAFE LIMITS
    ------------------------------------------
    */
    max: isDev ? 50000 : 5000,

    /*
    ------------------------------------------
    PREVENT IP SPOOF CRASH ISSUES
    ------------------------------------------
    */
    standardHeaders: true,
    legacyHeaders: false,

    /*
    ------------------------------------------
    CUSTOM RESPONSE (CONSISTENT API FORMAT)
    ------------------------------------------
    */
    handler: (req, res) => {

        return res.status(429).json({

            success: false,

            error: "RATE_LIMIT_EXCEEDED",

            message: "Too many requests, please try again later",

            retryAfter: Math.ceil(req.rateLimit?.resetTime || 0),

            timestamp: new Date().toISOString()
        });
    },

    /*
    ------------------------------------------
    SAFE FALLBACK
    ------------------------------------------
    */
    skipFailedRequests: false,
    skipSuccessfulRequests: false
});

module.exports = apiLimiter;