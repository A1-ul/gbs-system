"use strict";

const traces = [];

const MAX_TRACES =
    5000;

function addTrace(
    operation,
    metadata = {}
) {

    traces.push({

        operation:
            String(
                operation || ""
            ),

        metadata,

        timestamp:
            new Date()
                .toISOString()
    });

    if (
        traces.length >
        MAX_TRACES
    ) {

        traces.shift();
    }

    return true;
}

function getTraces() {

    return [...traces];
}

function clearTraces() {

    traces.length = 0;

    return true;
}

module.exports =
    Object.freeze({

        addTrace,

        getTraces,

        clearTraces
    });