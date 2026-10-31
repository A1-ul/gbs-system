"use strict";

const routes = require("./mapping.routes");

module.exports = {
    name: "mapping",
    basePath: "/api/v1/mapping",
    routes,
    initialize() {
        console.log("[MAPPING MODULE] Initialized");
    }
};
