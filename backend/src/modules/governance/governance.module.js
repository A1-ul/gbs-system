"use strict";

const routes = require("./governance.routes");

module.exports = {
    name: "governance",
    basePath: "/api/v1/governance",
    routes,
    initialize() {
        console.log("[GOVERNANCE MODULE] Initialized");
    }
};
