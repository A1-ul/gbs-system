"use strict";

/*
=========================================
ADMIN VALIDATORS
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const {
    query
} = require(
    "express-validator"
);

const systemStatsValidator = [

    query("from")
        .optional()
        .isISO8601()
        .withMessage(
            "Invalid from date"
        ),

    query("to")
        .optional()
        .isISO8601()
        .withMessage(
            "Invalid to date"
        )
];

module.exports =
    Object.freeze({

        systemStatsValidator
    });