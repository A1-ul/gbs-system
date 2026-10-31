"use strict";

const routes = require("./performance.routes");

module.exports = {
    name: "performance",
    routes,
    initialize() {
        console.log("[PERFORMANCE MODULE] Initialized");
    }
};
