"use strict";

const routes = require("./payment.routes");

module.exports = {
    name: "payment",
    routes,
    initialize() {
        console.log("[PAYMENT MODULE] Initialized");
    }
};
