"use strict";

const routes = require("./procurement.routes");

module.exports = {
    name: "procurement",
    basePath: "/api/v1/procurement",
    routes,
    initialize() {
        console.log("[PROCUREMENT MODULE] Initialized");
    }
};
