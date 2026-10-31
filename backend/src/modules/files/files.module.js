"use strict";

const routes = require("./files.routes");

module.exports = {
    name: "files",
    basePath: "/api/v1/files",
    routes,
    initialize() {
        console.log("[FILES MODULE] Initialized");
    }
};
