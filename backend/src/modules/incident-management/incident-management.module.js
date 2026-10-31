"use strict";

const routes = require("./incident-management.routes");

module.exports = {
    name: "incident-management",
    basePath: "/api/v1/incident-management",
    routes,
    initialize() {
        console.log("[INCIDENT-MANAGEMENT MODULE] Initialized");
    }
};
