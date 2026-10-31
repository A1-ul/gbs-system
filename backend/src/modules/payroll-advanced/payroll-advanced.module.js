"use strict";

const routes = require("./payroll-advanced.routes");

module.exports = {
    name: "payroll-advanced",
    basePath: "/api/v1/payroll-advanced",
    routes,
    initialize() {
        console.log("[PAYROLL-ADVANCED MODULE] Initialized");
    }
};
