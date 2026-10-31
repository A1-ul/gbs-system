"use strict";

const calendarModule =
    require("./calendar.module");

module.exports =
    Object.freeze({

        name:
            calendarModule.name,

        routes:
            calendarModule.routes,

        initialize:
            calendarModule.initialize
    });