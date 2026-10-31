"use strict";

const logger = require("../../utils/logger") || console;

async function getStatus() {
    try {
        return {
            module: "recovery",
            status: "OPERATIONAL",
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        if (logger.error) logger.error("RECOVERY_SERVICE_ERROR", { message: error.message });
        throw error;
    }
}

module.exports = {
    getStatus
};
