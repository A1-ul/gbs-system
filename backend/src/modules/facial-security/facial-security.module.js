"use strict";

const routes = require("./facial-security.routes");

module.exports = {
    name: "facial-security",
    basePath: "/api/v1/facial-security",
    routes,
    initialize() {
        console.log("[FACIAL-SECURITY MODULE] Initialized");
    }
};
