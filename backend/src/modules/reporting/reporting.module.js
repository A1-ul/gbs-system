"use strict";

const routes = require("./reporting.routes");

module.exports = {
    name: "reporting",
    basePath: "/api/v1/reporting",
    routes,
    initialize() {
        console.log("[REPORTING MODULE] Initialized");
    }
};
