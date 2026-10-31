"use strict";

const routes = require("./diagnostics.routes");

module.exports = {
    name: "diagnostics",
    basePath: "/api/v1/diagnostics",
    routes,
    initialize() {
        console.log("[DIAGNOSTICS MODULE] Initialized");
    }
};
