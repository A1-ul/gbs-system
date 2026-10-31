"use strict";

const routes = require("./backup.routes");

module.exports = {
    name: "backup",
    basePath: "/api/v1/backup",
    routes,
    initialize() {
        console.log("[BACKUP MODULE] Initialized");
    }
};
