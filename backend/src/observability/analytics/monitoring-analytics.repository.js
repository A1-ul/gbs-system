"use strict";

/*
=========================================
GBS ENTERPRISE ANALYTICS REPOSITORY
COMMONJS ONLY
=========================================
*/

const {
    prisma
} = require(
    "../../config/db"
);

function validatePrisma() {

    if (!prisma) {

        throw new Error(
            "Prisma client unavailable"
        );
    }
}

async function safeCount(model) {

    try {

        if (
            !model ||
            typeof model.count !==
                "function"
        ) {

            return 0;
        }

        return await model.count();

    } catch {

        return 0;
    }
}

async function findDashboardSummary() {

    validatePrisma();

    return {

        students:
            await safeCount(
                prisma.student
            ),

        teachers:
            await safeCount(
                prisma.teacher
            ),

        subjects:
            await safeCount(
                prisma.subject
            ),

        tenants:
            await safeCount(
                prisma.tenant
            ),

        attendance:
            await safeCount(
                prisma.attendance
            )
    };
}

async function findStudentAnalytics() {

    validatePrisma();

    return {

        totalStudents:
            await safeCount(
                prisma.student
            )
    };
}

async function findAcademicAnalytics() {

    validatePrisma();

    return {

        totalSubjects:
            await safeCount(
                prisma.subject
            )
    };
}

async function findFinanceAnalytics() {

    validatePrisma();

    return {

        totalTransactions: 0,

        totalRevenue: 0
    };
}

async function findAttendanceAnalytics() {

    validatePrisma();

    return {

        totalAttendance:
            await safeCount(
                prisma.attendance
            )
    };
}

async function findPerformanceAnalytics() {

    validatePrisma();

    return {

        averagePerformance: 0
    };
}

module.exports =
    Object.freeze({

        findDashboardSummary,

        findStudentAnalytics,

        findAcademicAnalytics,

        findFinanceAnalytics,

        findAttendanceAnalytics,

        findPerformanceAnalytics
    });