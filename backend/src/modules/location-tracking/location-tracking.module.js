"use strict";

const routes = require("./location-tracking.routes");

module.exports = {
    name: "location-tracking",
    basePath: "/api/v1/location-tracking",
    routes,
    initialize() {
        console.log("[LOCATION-TRACKING MODULE] Initialized");
    }
};
