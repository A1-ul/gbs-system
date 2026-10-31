"use strict";

const routes = require("./alert.routes");

module.exports = {
    name: "alert",
    routes,
    initialize() {
        console.log("[ALERT MODULE] Initialized");
    }
};
