"use strict";

const routes = require("./plugins.routes");

module.exports = {
    name: "plugins",
    basePath: "/api/v1/plugins",
    routes,
    initialize() {
        console.log("[PLUGINS MODULE] Initialized");
    }
};
