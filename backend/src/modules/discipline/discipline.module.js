"use strict";

const routes = require("./discipline.routes");

module.exports = {
    name: "discipline",
    routes,
    initialize() {
        console.log("[DISCIPLINE MODULE] Initialized");
    }
};
