"use strict";

const routes = require("./licensing.routes");

module.exports = {
    name: "licensing",
    basePath: "/api/v1/licensing",
    routes,
    initialize() {
        console.log("[LICENSING MODULE] Initialized");
    }
};
