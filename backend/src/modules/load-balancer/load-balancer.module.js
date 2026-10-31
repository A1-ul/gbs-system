"use strict";

const routes = require("./load-balancer.routes");

module.exports = {
    name: "load-balancer",
    basePath: "/api/v1/load-balancer",
    routes,
    initialize() {
        console.log("[LOAD-BALANCER MODULE] Initialized");
    }
};
