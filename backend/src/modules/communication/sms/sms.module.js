"use strict";

const routes = require("./sms.routes");

module.exports = {
    name: "sms",
    routes,
    initialize() {
        console.log("[SMS MODULE] Initialized");
    }
};
