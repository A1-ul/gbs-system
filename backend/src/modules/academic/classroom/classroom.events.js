"use strict";

const EventEmitter =
    require("events");

const classroomEvents =
    new EventEmitter();

classroomEvents.setMaxListeners(
    50
);

module.exports =
    Object.freeze(
        classroomEvents
    );