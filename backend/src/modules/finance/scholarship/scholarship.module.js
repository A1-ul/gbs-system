"use strict";

const routes = require("./scholarship.routes");

module.exports = {
    name: "scholarship",
    routes,
    initialize() {
        console.log("[SCHOLARSHIP MODULE] Initialized");
    }
};
