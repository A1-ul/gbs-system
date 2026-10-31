"use strict";

const routes = require("./tenant-management.routes");

module.exports = {
    name: "tenant-management",
    basePath: "/api/v1/tenant-management",
    routes,
    initialize() {
        console.log("[TENANT-MANAGEMENT MODULE] Initialized");
    }
};
