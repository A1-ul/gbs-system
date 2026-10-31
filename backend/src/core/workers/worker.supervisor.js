"use strict";
const logger = require("../../utils/logger") || console;
const registry = require("./worker.registry");

function monitor() {
    for (const [name, worker] of registry.registry) {
        if (!worker.active) {
            logger.warn(`[SUPERVISOR] Worker ${name} is inactive! Restarting...`);
            worker.start();
        }
    }
}

module.exports = { monitor };
