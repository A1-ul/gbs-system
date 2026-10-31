"use strict";

const logger = require("../../../utils/logger") || console;
const repository = require("./enrollment.repository");

async function getStatus() {
    try {
        const records = await repository.findAll();
        return { status: "healthy", count: records.length };
    } catch (error) {
        if (logger.error) {
            logger.error("ENROLLMENT_SERVICE_ERROR", { message: error.message });
        }
        throw error;
    }
}

module.exports = {
    getStatus
};
