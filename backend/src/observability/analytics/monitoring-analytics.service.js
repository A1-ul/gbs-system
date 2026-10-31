"use strict";

/*
==================================================
GBS ENTERPRISE ANALYTICS SERVICE
PRODUCTION READY
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

const repository =
    require(
        "./analytics_ownership.repository"
    );

/*
==================================================
REPOSITORY VALIDATION
==================================================
*/

const requiredMethods = [

    "findDashboardSummary",

    "findStudentAnalytics",

    "findAcademicAnalytics",

    "findFinanceAnalytics",

    "findAttendanceAnalytics",

    "findPerformanceAnalytics"
];

for (
    const method of requiredMethods
) {

    if (
        typeof repository[method] !==
        "function"
    ) {

        throw new Error(
            `Analytics Repository Missing Method: ${method}`
        );
    }
}

/*
==================================================
HELPER
==================================================
*/

async function execute(
    repositoryMethod
) {

    const result =
        await repositoryMethod();

    if (
        result === null ||
        result === undefined
    ) {

        throw new Error(
            "Analytics repository returned empty result"
        );
    }

    return result;
}

/*
==================================================
DASHBOARD
==================================================
*/

async function getDashboardSummary() {

    return execute(
        repository.findDashboardSummary
    );
}

/*
==================================================
STUDENT
==================================================
*/

async function getStudentAnalytics() {

    return execute(
        repository.findStudentAnalytics
    );
}

/*
==================================================
ACADEMIC
==================================================
*/

async function getAcademicAnalytics() {

    return execute(
        repository.findAcademicAnalytics
    );
}

/*
==================================================
FINANCE
==================================================
*/

async function getFinanceAnalytics() {

    return execute(
        repository.findFinanceAnalytics
    );
}

/*
==================================================
ATTENDANCE
==================================================
*/

async function getAttendanceAnalytics() {

    return execute(
        repository.findAttendanceAnalytics
    );
}

/*
==================================================
PERFORMANCE
==================================================
*/

async function getPerformanceAnalytics() {

    return execute(
        repository.findPerformanceAnalytics
    );
}

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        getDashboardSummary,

        getStudentAnalytics,

        getAcademicAnalytics,

        getFinanceAnalytics,

        getAttendanceAnalytics,

        getPerformanceAnalytics
    });