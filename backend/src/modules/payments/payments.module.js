"use strict";

const routes = require("./payments.routes");

module.exports = {
    name: "payments",
    basePath: "/api/v1/payments",
    routes,
    initialize() {
        console.log("[PAYMENTS MODULE] Initialized");
    }
};
