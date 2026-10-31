"use strict";

const routes = require("./research.routes");

module.exports = {
    name: "research",
    basePath: "/api/v1/research",
    routes,
    initialize() {
        console.log("[RESEARCH MODULE] Initialized");
    }
};
