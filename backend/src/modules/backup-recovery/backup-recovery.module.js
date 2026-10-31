"use strict";

const routes = require("./backup-recovery.routes");

module.exports = {
    name: "backup-recovery",
    basePath: "/api/v1/backup-recovery",
    routes,
    initialize() {
        console.log("[BACKUP-RECOVERY MODULE] Initialized");
    }
};
