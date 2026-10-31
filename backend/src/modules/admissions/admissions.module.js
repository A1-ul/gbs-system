"use strict";

const routes = require("./admissions.routes");

module.exports = {
    name: "admissions",
    basePath: "/api/v1/admissions",
    routes,
    initialize() {
        console.log("[ADMISSIONS MODULE] Initialized");
    }
};