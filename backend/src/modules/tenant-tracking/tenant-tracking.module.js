"use strict";

const routes = require("./tenant-tracking.routes");

module.exports = {
    name: "tenant-tracking",
    basePath: "/api/v1/tenant-tracking",
    routes,
    initialize() {
        console.log("[TENANT-TRACKING MODULE] Initialized");
    }
};
