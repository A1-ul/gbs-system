"use strict";

const routes = require("./ai-agents.routes");

module.exports = {
    name: "ai-agents",
    basePath: "/api/v1/ai-agents",
    routes,
    initialize() {
        console.log("[AI-AGENTS MODULE] Initialized");
    }
};
