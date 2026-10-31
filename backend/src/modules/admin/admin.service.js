"use strict";

/*
=========================================
ADMIN SERVICE
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const repository =
    require(
        "./admin.repository"
    );

const logger =
    require(
        "../../utils/logger"
    );

/*
=========================================
STATUS
=========================================
*/

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "admin",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
=========================================
SYSTEM STATS
=========================================
*/

async function getSystemStats() {

    try {

        const stats =
            await repository.getSystemStats();

        return Object.freeze({

            success: true,

            data:
                stats
        });

    } catch (error) {

        logger.error(
            "ADMIN_SERVICE_STATS_FAILURE",
            {
                message:
                    error.message
            }
        );

        throw error;
    }
}

/*
=========================================
SYSTEM HEALTH
=========================================
*/

async function getSystemHealth() {

    try {

        const health =
            await repository.getSystemHealth();

        return Object.freeze({

            success: true,

            data:
                health
        });

    } catch (error) {

        logger.error(
            "ADMIN_SERVICE_HEALTH_FAILURE",
            {
                message:
                    error.message
            }
        );

        throw error;
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getSystemStats,

        getSystemHealth
    });