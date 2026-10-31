"use strict";

const routes = require("./medical.routes");

module.exports = {
    name: "medical",
    routes,
    initialize() {
        console.log("[MEDICAL MODULE] Initialized");
    }
};
