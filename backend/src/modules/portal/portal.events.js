"use strict";

const EventEmitter =
    require("events");

const portalEvents =
    new EventEmitter();

portalEvents.setMaxListeners(
    100
);

module.exports =
    Object.freeze({
        portalEvents
    });