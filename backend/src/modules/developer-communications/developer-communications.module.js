"use strict";

const routes = require("./developer-communications.routes");

module.exports = {
    name: "developer-communications",
    basePath: "/api/v1/developer-communications",
    routes,
    initialize() {
        console.log("[DEVELOPER-COMMUNICATIONS MODULE] Initialized");
    }
};
