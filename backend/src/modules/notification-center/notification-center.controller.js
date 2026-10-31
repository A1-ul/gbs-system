"use strict";

const logger = require("../../utils/logger") || console;
const service = require("./notification-center.service");

async function getStatus(req, res, next) {
    try {
        const data = await service.getStatus();
        return res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (logger.error) logger.error("NOTIFICATION-CENTER_CONTROLLER_ERROR", { message: error.message });
        return next(error);
    }
}

module.exports = {
    getStatus
};
