"use strict";

const routes = require("./authentication.routes");

module.exports = {
    name: "authentication",
    basePath: "/api/v1/authentication",
    routes,
    initialize() {
        console.log("[AUTHENTICATION MODULE] Initialized");
    }
};
