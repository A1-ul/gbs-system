"use strict";

const EventEmitter =
    require("events");

const verificationEvents =
    new EventEmitter();

verificationEvents.setMaxListeners(
    100
);

module.exports =
    Object.freeze({

        emitter:
            verificationEvents,

        EVENTS:
            Object.freeze({

                VERIFICATION_CREATED:
                    "verification.created",

                VERIFICATION_UPDATED:
                    "verification.updated",

                VERIFICATION_DELETED:
                    "verification.deleted"
            })
    });