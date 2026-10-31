"use strict";

const logger = require("../../utils/logger") || console;


async function getStatus(req, res, next) {
    try {
        const data = { status: "healthy" };
        return res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (logger.error) {
            logger.error("HEALTH_CONTROLLER_ERROR", { message: error.message, stack: error.stack });
        }
        return next(error);
    }
}

module.exports = {
    getStatus
};
