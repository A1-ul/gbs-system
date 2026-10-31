"use strict";

const routes = require("./developer-platform.routes");

module.exports = {
    name: "developer-platform",
    basePath: "/api/v1/developer-platform",
    routes,
    initialize() {
        console.log("[DEVELOPER-PLATFORM MODULE] Initialized");
    }
};
