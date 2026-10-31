"use strict";

const classroomModule =
    require("./classroom.module");

module.exports =
    Object.freeze({

        name:
            classroomModule.name,

        routes:
            classroomModule.routes,

        initialize:
            classroomModule.initialize
    });