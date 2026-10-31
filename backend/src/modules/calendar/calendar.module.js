"use strict";

const routes = require("./calendar.routes");

module.exports = {
    name: "calendar",
    basePath: "/api/v1/calendar",
    routes,
    initialize() {
        console.log("[CALENDAR MODULE] Initialized");
    }
};
