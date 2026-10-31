"use strict";

const routes = require("./timetable.routes");

module.exports = {
    name: "timetable",
    basePath: "/api/v1/timetable",
    routes,
    initialize() {
        console.log("[TIMETABLE MODULE] Initialized");
    }
};
