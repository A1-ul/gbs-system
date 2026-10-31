"use strict";

const routes = require("./emergency-location.routes");

module.exports = {
    name: "emergency-location",
    basePath: "/api/v1/emergency-location",
    routes,
    initialize() {
        console.log("[EMERGENCY-LOCATION MODULE] Initialized");
    }
};
