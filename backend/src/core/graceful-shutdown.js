"use strict";

/*
====================================
GBS GRACEFUL SHUTDOWN HANDLER
====================================
*/

const logger = require("../utils/logger");
const { shutdownSocket } = require("../config/socket");
const { disconnectRedis } = require("../config/redis");

module.exports = function gracefulShutdown(server) {
    logger.info("Graceful shutdown handler registered");

    // Hook additional resource disconnections into process shutdown
    const performCleanup = async () => {
        try {
            logger.info("Cleaning up sockets and cache services...");
            shutdownSocket();
            await disconnectRedis();
            logger.info("Cleaned up sockets and cache services successfully.");
        } catch (error) {
            logger.error("Error during custom shutdown cleanup:", error);
        }
    };

    process.once("SIGTERM", performCleanup);
    process.once("SIGINT", performCleanup);
};
