"use strict";

const routes = require("./video.routes");

module.exports = {
    name: "video",
    basePath: "/api/v1/video",
    routes,
    initialize() {
        console.log("[VIDEO MODULE] Initialized");
    }
};
