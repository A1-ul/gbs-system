"use strict";

/*
==================================================
GBS ENTERPRISE ANALYTICS ROUTES
PRODUCTION READY
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

const express =
    require("express");

const router =
    express.Router();

const controller =
    require("./analytics_ownership.controller");

const {
    authenticate
} =
    require(
        "../../middlewares/auth.middleware"
    );

const {
    allowRoles
} =
    require(
        "../../middlewares/rbac.middleware"
    );

const validateMiddleware =
    require(
        "../../middlewares/validate.middleware"
    );

const {
    dashboardValidator,
    studentAnalyticsValidator,
    academicAnalyticsValidator,
    financeAnalyticsValidator,
    attendanceAnalyticsValidator,
    performanceAnalyticsValidator
} =
    require(
        "./analytics_ownership.validator"
    );

/*
==================================================
CONTROLLER VALIDATION
==================================================
*/

const requiredControllers = [

    "getDashboardSummary",

    "getStudentAnalytics",

    "getAcademicAnalytics",

    "getFinanceAnalytics",

    "getAttendanceAnalytics",

    "getPerformanceAnalytics"
];

for (
    const method of requiredControllers
) {

    if (
        typeof controller[method] !==
        "function"
    ) {

        throw new Error(
            `Analytics Controller Missing: ${method}`
        );
    }
}

/*
==================================================
MODULE HEALTH
GET /api/v1/analytics
==================================================
*/

router.get(
    "/",
    (
        req,
        res
    ) => {

        return res
            .status(200)
            .json({

                success:
                    true,

                module:
                    "analytics",

                status:
                    "active",

                timestamp:
                    new Date()
                        .toISOString()
            });
    }
);

/*
==================================================
DASHBOARD
GET /api/v1/analytics/dashboard
==================================================
*/

router.get(
    "/dashboard",

    authenticate,

    allowRoles(
        "SUPER_ADMIN",
        "ADMIN"
    ),

    dashboardValidator,

    validateMiddleware,

    controller.getDashboardSummary
);

/*
==================================================
STUDENT ANALYTICS
==================================================
*/

router.get(
    "/students",

    authenticate,

    allowRoles(
        "SUPER_ADMIN",
        "ADMIN"
    ),

    studentAnalyticsValidator,

    validateMiddleware,

    controller.getStudentAnalytics
);

/*
==================================================
ACADEMIC ANALYTICS
==================================================
*/

router.get(
    "/academic",

    authenticate,

    allowRoles(
        "SUPER_ADMIN",
        "ADMIN"
    ),

    academicAnalyticsValidator,

    validateMiddleware,

    controller.getAcademicAnalytics
);

/*
==================================================
FINANCE ANALYTICS
==================================================
*/

router.get(
    "/finance",

    authenticate,

    allowRoles(
        "SUPER_ADMIN",
        "ADMIN"
    ),

    financeAnalyticsValidator,

    validateMiddleware,

    controller.getFinanceAnalytics
);

/*
==================================================
ATTENDANCE ANALYTICS
==================================================
*/

router.get(
    "/attendance",

    authenticate,

    allowRoles(
        "SUPER_ADMIN",
        "ADMIN"
    ),

    attendanceAnalyticsValidator,

    validateMiddleware,

    controller.getAttendanceAnalytics
);

/*
==================================================
PERFORMANCE ANALYTICS
==================================================
*/

router.get(
    "/performance",

    authenticate,

    allowRoles(
        "SUPER_ADMIN",
        "ADMIN"
    ),

    performanceAnalyticsValidator,

    validateMiddleware,

    controller.getPerformanceAnalytics
);

/*
==================================================
EXPORT
==================================================
*/

module.exports =
    router;