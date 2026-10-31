"use strict";

const routes = require("./compliance.routes");

module.exports = {
    name: "compliance",
    basePath: "/api/v1/compliance",
    routes,
    initialize() {
        console.log("[COMPLIANCE MODULE] Initialized");
    }
};
