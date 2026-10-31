"use strict";

const routes = require("./security-alerts.routes");

module.exports = {
    name: "security-alerts",
    basePath: "/api/v1/security-alerts",
    routes,
    initialize() {
        console.log("[SECURITY-ALERTS MODULE] Initialized");
    }
};
