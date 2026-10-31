"use strict";

const EventEmitter =
    require("events");

const receiptEvents =
    new EventEmitter();

receiptEvents.setMaxListeners(
    100
);

module.exports =
    Object.freeze({

        receiptEvents
    });