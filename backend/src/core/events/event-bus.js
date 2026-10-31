"use strict";

const EventEmitter =
    require("events");

class EventBus extends EventEmitter {

    emitSafe(
        event,
        payload = {}
    ) {

        try {

            return super.emit(
                event,
                payload
            );

        } catch (error) {

            console.error(
                "EVENT BUS ERROR:",
                error.message
            );

            return false;
        }
    }

    listenerCountSafe(
        event
    ) {

        try {

            return super.listenerCount(
                event
            );

        } catch {

            return 0;
        }
    }
}

const eventBus =
    new EventBus();

eventBus.setMaxListeners(
    200
);

module.exports =
    eventBus;