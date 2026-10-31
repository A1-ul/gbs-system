"use strict";

/*
=========================================
ADMIN REPOSITORY
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const {
    prisma
} = require(
    "../../config/db"
);

const logger =
    require(
        "../../utils/logger"
    );

function validatePrisma() {

    if (
        !prisma
    ) {

        throw new Error(
            "Prisma client unavailable"
        );
    }
}

async function getSystemStats() {

    validatePrisma();

    const stats = {

        users: 0,

        tenants: 0,

        students: 0,

        teachers: 0,

        subjects: 0
    };

    try {

        if (
            prisma.user
        ) {

            stats.users =
                await prisma.user.count();
        }

        if (
            prisma.tenant
        ) {

            stats.tenants =
                await prisma.tenant.count();
        }

        if (
            prisma.student
        ) {

            stats.students =
                await prisma.student.count();
        }

        if (
            prisma.teacher
        ) {

            stats.teachers =
                await prisma.teacher.count();
        }

        if (
            prisma.subject
        ) {

            stats.subjects =
                await prisma.subject.count();
        }

        return stats;

    } catch (error) {

        logger.error(
            "ADMIN_REPOSITORY_STATS_FAILURE",
            {
                message:
                    error.message
            }
        );

        throw error;
    }
}

async function getSystemHealth() {

    validatePrisma();

    return Object.freeze({

        database: true,

        timestamp:
            new Date()
                .toISOString()
    });
}

module.exports =
    Object.freeze({

        getSystemStats,

        getSystemHealth
    });