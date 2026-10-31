"use strict";

const EventEmitter =
    require("events");

class ResultEventBus extends EventEmitter {}

const eventBus =
    new ResultEventBus();

eventBus.setMaxListeners(
    50
);

module.exports =
    Object.freeze({

        eventBus,

        EVENTS:
            Object.freeze({

                RESULT_CREATED:
                    "RESULT_CREATED",

                RESULT_UPDATED:
                    "RESULT_UPDATED",

                RESULT_DELETED:
                    "RESULT_DELETED"
            })
    });