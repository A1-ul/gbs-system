"use strict";

const routes = require("./developer-video.routes");

module.exports = {
    name: "developer-video",
    basePath: "/api/v1/developer-video",
    routes,
    initialize() {
        console.log("[DEVELOPER-VIDEO MODULE] Initialized");
    }
};
