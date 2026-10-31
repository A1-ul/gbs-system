"use strict";

const routes = require("./dashboard.routes");

module.exports = {
    name: "dashboard",
    routes,
    initialize() {
        console.log("[DASHBOARD MODULE] Initialized");
    }
};
