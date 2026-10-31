"use strict";

const routes = require("./invoice.routes");

module.exports = {
    name: "invoice",
    routes,
    initialize() {
        console.log("[INVOICE MODULE] Initialized");
    }
};
