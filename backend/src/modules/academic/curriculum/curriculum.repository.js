"use strict";

const logger = require("../../../utils/logger") || console;
const { prisma } = require("../../config/db");

async function findAll() {
    try {
        const modelName = "curriculum";
        if (prisma && prisma[modelName] && typeof prisma[modelName].findMany === "function") {
            return await prisma[modelName].findMany();
        }
        return [];
    } catch (error) {
        if (logger.error) {
            logger.error("CURRICULUM_REPOSITORY_FIND_ALL_ERROR", { message: error.message });
        }
        return [];
    }
}

module.exports = {
    findAll
};
