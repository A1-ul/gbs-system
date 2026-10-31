"use strict";

const metrics = {

    startedAt:
        Date.now(),

    requests:
        0,

    errors:
        0
};

function incrementRequests() {

    metrics.requests++;
}

function incrementErrors() {

    metrics.errors++;
}

function getMetrics() {

    return Object.freeze({

        uptimeSeconds:
            Math.floor(
                (
                    Date.now() -
                    metrics.startedAt
                ) / 1000
            ),

        requests:
            metrics.requests,

        errors:
            metrics.errors,

        memory:
            process.memoryUsage(),

        timestamp:
            new Date()
                .toISOString()
    });
}

module.exports =
    Object.freeze({

        incrementRequests,

        incrementErrors,

        getMetrics
    });