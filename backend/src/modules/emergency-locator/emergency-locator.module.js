"use strict";

const routes = require("./emergency-locator.routes");

module.exports = {
    name: "emergency-locator",
    basePath: "/api/v1/emergency-locator",
    routes,
    initialize() {
        console.log("[EMERGENCY-LOCATOR MODULE] Initialized");
    }
};
