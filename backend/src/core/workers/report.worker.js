"use strict";
const logger = require("../../utils/logger") || console;

class Worker {
    constructor(name) {
        this.name = name;
        this.active = false;
    }
    start() {
        this.active = true;
        logger.info(`[WORKER ${this.name.toUpperCase()}] started processing jobs.`);
    }
    stop() {
        this.active = false;
        logger.info(`[WORKER ${this.name.toUpperCase()}] stopped processing jobs.`);
    }
}

module.exports = new Worker(baseName);
