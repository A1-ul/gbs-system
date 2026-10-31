"use strict";

const routes = require("./budget.routes");

module.exports = {
    name: "budget",
    routes,
    initialize() {
        console.log("[BUDGET MODULE] Initialized");
    }
};
