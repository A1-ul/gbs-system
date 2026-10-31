"use strict";

const routes = require("./search.routes");

module.exports = {
    name: "search",
    basePath: "/api/v1/search",
    routes,
    initialize() {
        console.log("[SEARCH MODULE] Initialized");
    }
};
