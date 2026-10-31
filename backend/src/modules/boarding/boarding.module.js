"use strict";

const routes = require("./boarding.routes");

module.exports = {
    name: "boarding",
    routes,
    initialize() {
        console.log("[BOARDING MODULE] Initialized");
    }
};
