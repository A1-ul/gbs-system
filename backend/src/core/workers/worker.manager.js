"use strict";

/*
====================================
GBS WORKER MANAGER
====================================
*/

const logger = require("../../utils/logger");

let running = false;

function startWorkers() {
    if (running) {
        return true;
    }
    logger.info("Initializing background workers...");
    running = true;
    logger.info("Background workers started successfully.");
    return true;
}

function stopWorkers() {
    running = false;
    logger.info("Background workers stopped.");
    return true;
}

module.exports = {
    startWorkers,
    stopWorkers
};
