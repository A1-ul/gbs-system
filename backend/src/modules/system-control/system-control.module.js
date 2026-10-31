"use strict";

const routes = require("./system-control.routes");

module.exports = {
    name: "system-control",
    basePath: "/api/v1/system-control",
    routes,
    initialize() {
        console.log("[SYSTEM-CONTROL MODULE] Initialized");
    }
};
