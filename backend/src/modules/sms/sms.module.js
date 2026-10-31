"use strict";

const routes = require("./sms.routes");

module.exports = {
    name: "sms",
    basePath: "/api/v1/sms",
    routes,
    initialize() {
        console.log("[SMS MODULE] Initialized");
    }
};
