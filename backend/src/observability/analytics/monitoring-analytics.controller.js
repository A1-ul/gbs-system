"use strict";

/*
=========================================
GBS ENTERPRISE ANALYTICS CONTROLLER
COMMONJS ONLY
=========================================
*/

const analyticsService =
    require("./analytics_ownership.service");

function validateServiceMethod(method) {

    if (
        typeof analyticsService[method] !==
        "function"
    ) {

        const error =
            new Error(
                `Analytics service method missing: ${method}`
            );

        error.statusCode = 500;

        throw error;
    }
}

async function getDashboardSummary(
    req,
    res,
    next
) {

    try {

        validateServiceMethod(
            "getDashboardSummary"
        );

     const result =
    await analyticsService.getDashboardSummary();

if (
    result === null ||
    result === undefined
) {

    throw new Error(
        "Analytics service returned empty response"
    );
}

return res
    .status(200)
    .json(result); 
        

    } catch (error) {

        return next(error);
    }
}

async function getStudentAnalytics(
    req,
    res,
    next
) {

    try {

        validateServiceMethod(
            "getStudentAnalytics"
        );

        const result =
            await analyticsService.getStudentAnalytics();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getAcademicAnalytics(
    req,
    res,
    next
) {

    try {

        validateServiceMethod(
            "getAcademicAnalytics"
        );

        const result =
            await analyticsService.getAcademicAnalytics();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getFinanceAnalytics(
    req,
    res,
    next
) {

    try {

        validateServiceMethod(
            "getFinanceAnalytics"
        );

        const result =
            await analyticsService.getFinanceAnalytics();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getAttendanceAnalytics(
    req,
    res,
    next
) {

    try {

        validateServiceMethod(
            "getAttendanceAnalytics"
        );

        const result =
            await analyticsService.getAttendanceAnalytics();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getPerformanceAnalytics(
    req,
    res,
    next
) {

    try {

        validateServiceMethod(
            "getPerformanceAnalytics"
        );

        const result =
            await analyticsService.getPerformanceAnalytics();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

module.exports =
    Object.freeze({

        getDashboardSummary,

        getStudentAnalytics,

        getAcademicAnalytics,

        getFinanceAnalytics,

        getAttendanceAnalytics,

        getPerformanceAnalytics
    });