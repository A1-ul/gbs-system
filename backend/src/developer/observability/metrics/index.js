"use strict";

const metrics =
    Object.create(null);

function increment(
    name
) {

    if (
        typeof name !== "string" ||
        !name.trim()
    ) {

        return false;
    }

    metrics[name] =
        (metrics[name] || 0) + 1;

    return true;
}

function getMetrics() {

    return {
        ...metrics
    };
}

function resetMetrics() {

    Object.keys(metrics)
        .forEach(
            function (key) {

                delete metrics[key];
            }
        );

    return true;
}

module.exports =
    Object.freeze({

        increment,

        getMetrics,

        resetMetrics
    });