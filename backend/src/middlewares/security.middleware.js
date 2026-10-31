"use strict";

const helmet =
    require("helmet");

const compression =
    require("compression");

const rateLimit =
    require("express-rate-limit");

const apiLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        max:
            1000,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        message: {

            success: false,

            message:
                "Too many requests. Try again later."
        }
    });

module.exports =
    Object.freeze({

        helmet:
            helmet(),

        compression:
            compression(),

        apiLimiter
    });