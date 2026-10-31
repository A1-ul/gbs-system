"use strict";

const routes = require("./machine-learning.routes");

module.exports = {
    name: "machine-learning",
    basePath: "/api/v1/machine-learning",
    routes,
    initialize() {
        console.log("[MACHINE-LEARNING MODULE] Initialized");
    }
};
