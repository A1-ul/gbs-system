"use strict";

const routes = require("./email.routes");

module.exports = {
    name: "email",
    basePath: "/api/v1/email",
    routes,
    initialize() {
        console.log("[EMAIL MODULE] Initialized");
    }
};
