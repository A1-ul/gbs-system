"use strict";

const routes = require("./backup.routes");

module.exports = {
    name: "backup",
    routes,
    initialize() {
        console.log("[BACKUP MODULE] Initialized");
    }
};
