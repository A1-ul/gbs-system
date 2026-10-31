"use strict";

const routes = require("./loans.routes");

module.exports = {
    name: "loans",
    basePath: "/api/v1/loans",
    routes,
    initialize() {
        console.log("[LOANS MODULE] Initialized");
    }
};
