"use strict";

const EventEmitter =
    require("events");

const learningEvents =
    new EventEmitter();

learningEvents.setMaxListeners(
    100
);

module.exports =
    Object.freeze({
        learningEvents
    });