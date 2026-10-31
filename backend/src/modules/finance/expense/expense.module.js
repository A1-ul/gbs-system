"use strict";

const routes = require("./expense.routes");

module.exports = {
    name: "expense",
    routes,
    initialize() {
        console.log("[EXPENSE MODULE] Initialized");
    }
};
