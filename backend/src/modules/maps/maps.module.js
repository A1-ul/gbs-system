"use strict";

const routes = require("./maps.routes");

module.exports = {
    name: "maps",
    basePath: "/api/v1/maps",
    routes,
    initialize() {
        console.log("[MAPS MODULE] Initialized");
    }
};
