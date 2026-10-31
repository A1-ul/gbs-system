"use strict";

const routes = require("./alumni-relations.routes");

module.exports = {
    name: "alumni-relations",
    basePath: "/api/v1/alumni-relations",
    routes,
    initialize() {
        console.log("[ALUMNI-RELATIONS MODULE] Initialized");
    }
};
