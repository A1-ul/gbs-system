"use strict";

const routes = require("./process.routes");

module.exports = {
    name: "process",
    routes,
    initialize() {
        console.log("[PROCESS MODULE] Initialized");
    }
};
