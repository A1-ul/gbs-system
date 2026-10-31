"use strict";

const routes = require("./automation.routes");

module.exports = {
    name: "automation",
    routes,
    initialize() {
        console.log("[AUTOMATION MODULE] Initialized");
    }
};
