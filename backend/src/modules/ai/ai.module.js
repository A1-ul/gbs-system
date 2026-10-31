"use strict";

const routes = require("./ai.routes");

module.exports = {
    name: "ai",
    basePath: "/api/v1/ai",
    routes,
    initialize() {
        console.log("[AI MODULE] Initialized");
    }
};
