"use strict";

const routes = require("./failover.routes");

module.exports = {
    name: "failover",
    routes,
    initialize() {
        console.log("[FAILOVER MODULE] Initialized");
    }
};
