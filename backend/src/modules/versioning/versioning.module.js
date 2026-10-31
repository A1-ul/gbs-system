"use strict";

const routes = require("./versioning.routes");

module.exports = {
    name: "versioning",
    basePath: "/api/v1/versioning",
    routes,
    initialize() {
        console.log("[VERSIONING MODULE] Initialized");
    }
};
