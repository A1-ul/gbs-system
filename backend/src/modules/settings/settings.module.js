"use strict";

const routes = require("./settings.routes");

module.exports = {
    name: "settings",
    routes,
    initialize() {
        console.log("[SETTINGS MODULE] Initialized");
    }
};
