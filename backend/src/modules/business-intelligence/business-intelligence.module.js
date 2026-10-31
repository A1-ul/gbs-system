"use strict";

const routes = require("./business-intelligence.routes");

module.exports = {
    name: "business-intelligence",
    basePath: "/api/v1/business-intelligence",
    routes,
    initialize() {
        console.log("[BUSINESS-INTELLIGENCE MODULE] Initialized");
    }
};
