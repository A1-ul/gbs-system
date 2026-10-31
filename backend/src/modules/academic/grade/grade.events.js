"use strict";

const EventEmitter =
    require("events");

class GradeEvents extends EventEmitter {}

const gradeEvents =
    new GradeEvents();

gradeEvents.setMaxListeners(
    100
);

gradeEvents.on(
    "error",
    (error) => {

        console.error(
            "[GRADE EVENT ERROR]",
            error.message
        );
    }
);

module.exports =
    Object.freeze(
        gradeEvents
    );