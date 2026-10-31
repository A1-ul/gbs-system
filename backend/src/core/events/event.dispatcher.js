"use strict";

const registry =
    require(
        "./event.registry"
    );

async function dispatchEvent(
    eventName,
    payload = {}
) {

    const handlers =
        registry.getHandlers(
            eventName
        );

    for (
        const handler
        of handlers
    ) {

        try {

            await handler(
                payload
            );

        } catch (
            error
        ) {

            console.error(
                error.message
            );
        }
    }

    return true;
}

module.exports =
    dispatchEvent;