"use strict";

const routes = require("./procurement.routes");

module.exports = {
    name: "procurement",
    routes,
    initialize() {
        console.log("[PROCUREMENT MODULE] Initialized");
    }
};
