"use strict";

/*
====================================
GBS ENTERPRISE DB DRIVER
====================================
*/

const prisma = require("./prisma");
const logger = require("../utils/logger");

async function connectDB() {
    try {
        logger.info("Connecting database client...");
        await prisma.connect();
        logger.info("Database connection validated successfully.");
        return true;
    } catch (error) {
        logger.error("Failed database connection setup:", error);
        throw error;
    }
}

async function disconnectDB() {
    try {
        logger.info("Disconnecting database client...");
        await prisma.disconnect();
        logger.info("Database disconnected successfully.");
        return true;
    } catch (error) {
        logger.error("Failed database disconnect setup:", error);
        return false;
    }
}

module.exports = {
    connectDB,
    disconnectDB,
    prisma
};
