"use strict";

const logger = require("../../../utils/logger") || console;
const repository = require("./lesson_plan.repository");

async function getStatus() {
    try {
        const records = await repository.findAll();
        return { status: "healthy", count: records.length };
    } catch (error) {
        if (logger.error) {
            logger.error("LESSON_PLAN_SERVICE_ERROR", { message: error.message });
        }
        throw error;
    }
}

module.exports = {
    getStatus
};
