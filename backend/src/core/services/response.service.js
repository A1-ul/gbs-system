"use strict";

const logger = require("../../utils/logger") || console;


async function getStatus() {
    try {
        const records = [];
        return { status: "healthy", count: records.length };
    } catch (error) {
        if (logger.error) {
            logger.error("RESPONSE_SERVICE_ERROR", { message: error.message });
        }
        throw error;
    }
}

module.exports = {
    getStatus
};
