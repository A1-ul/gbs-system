"use strict";

const routes = require("./announcement.routes");

module.exports = {
    name: "announcement",
    routes,
    initialize() {
        console.log("[ANNOUNCEMENT MODULE] Initialized");
    }
};
