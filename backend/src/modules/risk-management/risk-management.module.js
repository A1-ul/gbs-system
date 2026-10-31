"use strict";

const routes = require("./risk-management.routes");

module.exports = {
    name: "risk-management",
    basePath: "/api/v1/risk-management",
    routes,
    initialize() {
        console.log("[RISK-MANAGEMENT MODULE] Initialized");
    }
};
