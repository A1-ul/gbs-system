"use strict";

const routes = require("./engine.routes");

module.exports = {
    name: "engine",
    routes,
    initialize() {
        console.log("[ENGINE MODULE] Initialized");
    }
};
