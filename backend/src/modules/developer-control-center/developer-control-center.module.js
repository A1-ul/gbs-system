"use strict";

const routes = require("./developer-control-center.routes");

module.exports = {
    name: "developer-control-center",
    basePath: "/api/v1/developer-control-center",
    routes,
    initialize() {
        console.log("[DEVELOPER-CONTROL-CENTER MODULE] Initialized");
    }
};
