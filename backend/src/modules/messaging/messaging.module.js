"use strict";

const routes = require("./messaging.routes");

module.exports = {
    name: "messaging",
    basePath: "/api/v1/messaging",
    routes,
    initialize() {
        console.log("[MESSAGING MODULE] Initialized");
    }
};
