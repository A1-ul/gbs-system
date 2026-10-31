"use strict";

const routes = require("./curriculum.routes");

module.exports = {
    name: "curriculum",
    routes,
    initialize() {
        console.log("[CURRICULUM MODULE] Initialized");
    }
};
