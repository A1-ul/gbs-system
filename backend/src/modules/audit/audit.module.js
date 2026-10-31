"use strict";

const routes = require("./audit.routes");

module.exports = {
    name: "audit",
    basePath: "/api/v1/audit",
    routes,
    initialize() {
        console.log("[AUDIT MODULE] Initialized");
    }
};
