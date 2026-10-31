"use strict";

const EventEmitter =
    require("events");

const examEvents =
    new EventEmitter();

examEvents.setMaxListeners(
    100
);

module.exports =
    Object.freeze({
        examEvents
    });