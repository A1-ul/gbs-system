"use strict";

const routes = require("./media.routes");

module.exports = {
    name: "media",
    basePath: "/api/v1/media",
    routes,
    initialize() {
        console.log("[MEDIA MODULE] Initialized");
    }
};
