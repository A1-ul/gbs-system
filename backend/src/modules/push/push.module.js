"use strict";

const routes = require("./push.routes");

module.exports = {
    name: "push",
    basePath: "/api/v1/push",
    routes,
    initialize() {
        console.log("[PUSH MODULE] Initialized");
    }
};
