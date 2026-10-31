"use strict";

/*
=========================================
ADMIN CONTROLLER
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const adminService =
    require("./admin.service");

const logger =
    require("../../utils/logger");

function validateServiceMethod(
    method
) {

    return (
        typeof adminService[method] ===
        "function"
    );
}

async function getStatus(
    req,
    res,
    next
) {

    try {

        if (
            !validateServiceMethod(
                "getStatus"
            )
        ) {

            throw new Error(
                "Admin service unavailable"
            );
        }

        const result =
            await adminService.getStatus();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        logger.error(
            "ADMIN_CONTROLLER_STATUS_FAILURE",
            {
                message:
                    error.message
            }
        );

        return next(error);
    }
}

async function getSystemStats(
    req,
    res,
    next
) {

    try {

        if (
            !validateServiceMethod(
                "getSystemStats"
            )
        ) {

            throw new Error(
                "Admin service unavailable"
            );
        }

        const result =
            await adminService.getSystemStats();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        logger.error(
            "ADMIN_CONTROLLER_STATS_FAILURE",
            {
                message:
                    error.message
            }
        );

        return next(error);
    }
}

async function getSystemHealth(
    req,
    res,
    next
) {

    try {

        if (
            !validateServiceMethod(
                "getSystemHealth"
            )
        ) {

            throw new Error(
                "Admin service unavailable"
            );
        }

        const result =
            await adminService.getSystemHealth();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        logger.error(
            "ADMIN_CONTROLLER_HEALTH_FAILURE",
            {
                message:
                    error.message
            }
        );

        return next(error);
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getSystemStats,

        getSystemHealth
    });