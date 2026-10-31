"use strict";

const routes = require("./grants.routes");

module.exports = {
    name: "grants",
    basePath: "/api/v1/grants",
    routes,
    initialize() {
        console.log("[GRANTS MODULE] Initialized");
    }
};
