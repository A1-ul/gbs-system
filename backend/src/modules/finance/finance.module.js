"use strict";

const routes = require("./finance.routes");

module.exports = {
    name: "finance",
    basePath: "/api/v1/finance",
    routes,
    initialize() {
        console.log("[FINANCE MODULE] Initialized");
    }
};
