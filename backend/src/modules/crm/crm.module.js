"use strict";

const routes = require("./crm.routes");

module.exports = {
    name: "crm",
    basePath: "/api/v1/crm",
    routes,
    initialize() {
        console.log("[CRM MODULE] Initialized");
    }
};
