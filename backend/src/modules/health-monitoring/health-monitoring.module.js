"use strict";

const routes = require("./health-monitoring.routes");

module.exports = {
    name: "health-monitoring",
    basePath: "/api/v1/health-monitoring",
    routes,
    initialize() {
        console.log("[HEALTH-MONITORING MODULE] Initialized");
    }
};
