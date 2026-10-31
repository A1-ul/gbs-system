"use strict";

const {
    getJobCount
} = require(
    "../../config/queue"
);

async function checkQueue() {

    return {

        healthy:
            true,

        queuedJobs:
            getJobCount(),

        timestamp:
            new Date()
                .toISOString()
    };
}

module.exports =
    checkQueue;