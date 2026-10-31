"use strict";

const routes = require("./attendance.routes");

module.exports = {
    name: "attendance",
    basePath: "/api/v1/attendance",
    routes,
    initialize() {
        console.log("[ATTENDANCE MODULE] Initialized");
    }
};
