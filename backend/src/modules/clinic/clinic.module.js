"use strict";

const routes = require("./clinic.routes");

module.exports = {
    name: "clinic",
    basePath: "/api/v1/clinic",
    routes,
    initialize() {
        console.log("[CLINIC MODULE] Initialized");
    }
};
