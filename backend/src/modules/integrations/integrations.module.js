"use strict";

const routes = require("./integrations.routes");

module.exports = {
    name: "integrations",
    basePath: "/api/v1/integrations",
    routes,
    initialize() {
        console.log("[INTEGRATIONS MODULE] Initialized");
    }
};
