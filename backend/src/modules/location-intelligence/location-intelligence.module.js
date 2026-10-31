"use strict";

const routes = require("./location-intelligence.routes");

module.exports = {
    name: "location-intelligence",
    basePath: "/api/v1/location-intelligence",
    routes,
    initialize() {
        console.log("[LOCATION-INTELLIGENCE MODULE] Initialized");
    }
};
