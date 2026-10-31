"use strict";

const EventEmitter =
    require("events");

const graduateEvents =
    new EventEmitter();

graduateEvents.setMaxListeners(
    100
);

module.exports =
    Object.freeze({
        graduateEvents
    });