"use strict";

const routes = require("./analytics.routes");

module.exports = {
    name: "analytics",
    basePath: "/api/v1/analytics",
    routes,
    initialize() {
        console.log("[ANALYTICS MODULE] Initialized");
    }
};
