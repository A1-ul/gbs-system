"use strict";

/*
=========================================
GBS ENTERPRISE ANALYTICS VALIDATORS
COMMONJS ONLY
=========================================
*/

const {
    query
} = require(
    "express-validator"
);

const commonDateFilters = [

    query("from")
        .optional()
        .isISO8601()
        .withMessage(
            "from must be a valid ISO date"
        ),

    query("to")
        .optional()
        .isISO8601()
        .withMessage(
            "to must be a valid ISO date"
        )
];

const dashboardValidator =
    [
        ...commonDateFilters
    ];

const studentAnalyticsValidator =
    [
        ...commonDateFilters
    ];

const academicAnalyticsValidator =
    [
        ...commonDateFilters
    ];

const financeAnalyticsValidator =
    [
        ...commonDateFilters
    ];

const attendanceAnalyticsValidator =
    [
        ...commonDateFilters
    ];

const performanceAnalyticsValidator =
    [
        ...commonDateFilters
    ];

module.exports =
    Object.freeze({

        dashboardValidator,

        studentAnalyticsValidator,

        academicAnalyticsValidator,

        financeAnalyticsValidator,

        attendanceAnalyticsValidator,

        performanceAnalyticsValidator
    });