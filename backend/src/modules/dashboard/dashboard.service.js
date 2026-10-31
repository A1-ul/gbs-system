"use strict";

/*
==================================================
DASHBOARD SERVICE
ENTERPRISE HARDENED
COMMONJS ONLY
==================================================
*/

const repository =
    require(
        "./dashboard.repository"
    );

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "dashboard",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getDashboard() {

    try {

        const stats =
            await repository.getStatistics();

        return Object.freeze({

            success: true,

            data:
                stats
        });

    } catch (error) {

        return Object.freeze({

            success: false,

            message:
                error.message ||
                "Dashboard load failed"
        });
    }
}

module.exports =
    Object.freeze({

        getStatus,
        getDashboard
    });