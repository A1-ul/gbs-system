"use strict";

const workerManager = require("./worker.manager");

module.exports = {
    startWorkers: workerManager.startWorkers,
    stopWorkers: workerManager.stopWorkers
};
