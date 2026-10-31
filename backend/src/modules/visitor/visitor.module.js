"use strict";

const routes = require("./visitor.routes");

module.exports = {
    name: "visitor",
    routes,
    initialize() {
        console.log("[VISITOR MODULE] Initialized");
    }
};
