"use strict";

const routes = require("./inventory.routes");

module.exports = {
    name: "inventory",
    routes,
    initialize() {
        console.log("[INVENTORY MODULE] Initialized");
    }
};
