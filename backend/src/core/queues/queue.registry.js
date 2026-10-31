"use strict";

const registry =
    Object.create(
        null
    );

function registerQueue(
    name,
    queue
) {

    if (
        !name
    ) {

        return false;
    }

    registry[name] =
        queue;

    return true;
}

function getQueue(
    name
) {

    return (
        registry[name] ||
        null
    );
}

function getQueues() {

    return Object.freeze({

        ...registry
    });
}

module.exports =
    Object.freeze({

        registerQueue,

        getQueue,

        getQueues
    });