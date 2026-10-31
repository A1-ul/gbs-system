"use strict";

const routes = require("./document-management.routes");

module.exports = {
    name: "document-management",
    basePath: "/api/v1/document-management",
    routes,
    initialize() {
        console.log("[DOCUMENT-MANAGEMENT MODULE] Initialized");
    }
};
