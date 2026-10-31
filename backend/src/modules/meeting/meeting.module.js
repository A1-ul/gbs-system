"use strict";

const routes = require("./meeting.routes");

module.exports = {
    name: "meeting",
    basePath: "/api/v1/meeting",
    routes,
    initialize() {
        console.log("[MEETING MODULE] Initialized");
    }
};
