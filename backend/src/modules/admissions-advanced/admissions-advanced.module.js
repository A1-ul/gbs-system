"use strict";

const routes = require("./admissions-advanced.routes");

module.exports = {
    name: "admissions-advanced",
    basePath: "/api/v1/admissions-advanced",
    routes,
    initialize() {
        console.log("[ADMISSIONS-ADVANCED MODULE] Initialized");
    }
};
