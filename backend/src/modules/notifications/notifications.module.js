"use strict";

const routes = require("./notifications.routes");

module.exports = {
    name: "notifications",
    basePath: "/api/v1/notifications",
    routes,
    initialize() {
        console.log("[NOTIFICATIONS MODULE] Initialized");
    }
};
