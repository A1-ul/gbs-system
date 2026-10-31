"use strict";

const routes = require("./archive.routes");

module.exports = {
    name: "archive",
    basePath: "/api/v1/archive",
    routes,
    initialize() {
        console.log("[ARCHIVE MODULE] Initialized");
    }
};
