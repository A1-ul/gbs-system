"use strict";

const routes = require("./hr.routes");

module.exports = {
    name: "hr",
    routes,
    initialize() {
        console.log("[HR MODULE] Initialized");
    }
};
