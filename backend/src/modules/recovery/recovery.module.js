"use strict";

const routes = require("./recovery.routes");

module.exports = {
    name: "recovery",
    basePath: "/api/v1/recovery",
    routes,
    initialize() {
        console.log("[RECOVERY MODULE] Initialized");
    }
};
