"use strict";

const routes = require("./subscription-management.routes");

module.exports = {
    name: "subscription-management",
    basePath: "/api/v1/subscription-management",
    routes,
    initialize() {
        console.log("[SUBSCRIPTION-MANAGEMENT MODULE] Initialized");
    }
};
