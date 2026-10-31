"use strict";

const routes = require("./observability.routes");

module.exports = {
    name: "observability",
    basePath: "/api/v1/observability",
    routes,
    initialize() {
        console.log("[OBSERVABILITY MODULE] Initialized");
    }
};
