"use strict";

const EventEmitter =
    require("events");

const libraryEvents =
    new EventEmitter();

libraryEvents.setMaxListeners(
    100
);

module.exports =
    Object.freeze({
        libraryEvents
    });