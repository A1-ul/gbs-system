"use strict";

const routes = require("./certificate.routes");

module.exports = {
    name: "certificate",
    routes,
    initialize() {
        console.log("[CERTIFICATE MODULE] Initialized");
    }
};
