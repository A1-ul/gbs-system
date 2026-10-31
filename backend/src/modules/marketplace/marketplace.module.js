"use strict";

const routes = require("./marketplace.routes");

module.exports = {
    name: "marketplace",
    basePath: "/api/v1/marketplace",
    routes,
    initialize() {
        console.log("[MARKETPLACE MODULE] Initialized");
    }
};
