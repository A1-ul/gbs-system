"use strict";

const routes = require("./enrollment.routes");

module.exports = {
    name: "enrollment",
    routes,
    initialize() {
        console.log("[ENROLLMENT MODULE] Initialized");
    }
};
