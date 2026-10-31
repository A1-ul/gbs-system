"use strict";

const routes = require("./assignment.routes");

module.exports = {
    name: "assignment",
    basePath: "/api/v1/assignments",
    routes,
    initialize() {
        console.log("[ASSIGNMENT MODULE] Initialized and registered at /api/v1/assignments");
    }
};
