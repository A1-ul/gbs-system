"use strict";

const routes = require("./workflow.routes");

module.exports = Object.freeze({
    name: "workflow",
    routes,
    initialize() {
        console.log(
            "[WORKFLOW MODULE] Initialized"
        );
    }
});