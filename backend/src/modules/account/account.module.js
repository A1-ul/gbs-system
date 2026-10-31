"use strict";

const routes = require("./account.routes");

module.exports = {
    name: "account",
    basePath: "/api/v1/account",
    routes,
    initialize() {
        console.log("[ACCOUNT MODULE] Initialized");
    }
};
