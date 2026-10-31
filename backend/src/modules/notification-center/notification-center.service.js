"use strict";

const logger = require("../../utils/logger") || console;

async function getStatus() {
    try {
        return {
            module: "notification-center",
            status: "OPERATIONAL",
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        if (logger.error) logger.error("NOTIFICATION-CENTER_SERVICE_ERROR", { message: error.message });
        throw error;
    }
}

module.exports = {
    getStatus
};
