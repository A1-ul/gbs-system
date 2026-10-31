"use strict";

const routes = require("./transport.routes");

module.exports = {
    name: "transport",
    routes,
    initialize() {
        console.log("[TRANSPORT MODULE] Initialized");
    }
};
