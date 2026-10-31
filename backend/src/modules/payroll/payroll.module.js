"use strict";

const routes = require("./payroll.routes");

module.exports = {
    name: "payroll",
    basePath: "/api/v1/payroll",
    routes,
    initialize() {
        console.log("[PAYROLL MODULE] Initialized");
    }
};
