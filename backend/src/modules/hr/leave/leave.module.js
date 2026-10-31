"use strict";

const routes = require("./leave.routes");

module.exports = {
    name: "leave",
    routes,
    initialize() {
        console.log("[LEAVE MODULE] Initialized");
    }
};
