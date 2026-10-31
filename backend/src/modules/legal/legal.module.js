"use strict";

const routes = require("./legal.routes");

module.exports = {
    name: "legal",
    basePath: "/api/v1/legal",
    routes,
    initialize() {
        console.log("[LEGAL MODULE] Initialized");
    }
};
