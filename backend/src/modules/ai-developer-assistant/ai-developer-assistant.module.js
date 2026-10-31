"use strict";

const routes = require("./ai-developer-assistant.routes");

module.exports = {
    name: "ai-developer-assistant",
    basePath: "/api/v1/ai-developer-assistant",
    routes,
    initialize() {
        console.log("[AI-DEVELOPER-ASSISTANT MODULE] Initialized");
    }
};
