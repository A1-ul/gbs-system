"use strict";

const registry =
    Object.create(
        null
    );

function registerEvent(
    eventName,
    handler
) {

    if (
        !registry[
            eventName
        ]
    ) {

        registry[
            eventName
        ] = [];
    }

    registry[
        eventName
    ].push(
        handler
    );

    return true;
}

function getHandlers(
    eventName
) {

    return (
        registry[
            eventName
        ] || []
    );
}

module.exports =
    Object.freeze({

        registerEvent,

        getHandlers
    });