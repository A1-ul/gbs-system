"use strict";

const routes = require("./collectors.routes");

module.exports = {
    name: "metrics",
    routes,
    initialize() {
        console.log("[METRICS MODULE] Initialized");
    }
};
