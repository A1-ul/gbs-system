"use strict";

const routes = require("./api-gateway.routes");

module.exports = {
    name: "api-gateway",
    basePath: "/api/v1/api-gateway",
    routes,
    initialize() {
        console.log("[API-GATEWAY MODULE] Initialized");
    }
};
