"use strict";

const routes = require("./examinations.routes");

module.exports = {
    name: "examinations",
    routes,
    initialize() {
        console.log("[EXAMINATIONS MODULE] Initialized");
    }
};
