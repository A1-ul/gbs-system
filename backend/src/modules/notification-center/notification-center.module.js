"use strict";

const routes = require("./notification-center.routes");

module.exports = {
    name: "notification-center",
    basePath: "/api/v1/notification-center",
    routes,
    initialize() {
        console.log("[NOTIFICATION-CENTER MODULE] Initialized");
    }
};
