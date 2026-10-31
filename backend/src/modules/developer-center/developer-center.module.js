"use strict";

const routes = require("./developer-center.routes");

module.exports = {
    name: "developer-center",
    basePath: "/api/v1/developer-center",
    routes,
    initialize() {
        console.log("[DEVELOPER-CENTER MODULE] Initialized");
    }
};
