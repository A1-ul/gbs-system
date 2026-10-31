"use strict";

const routes = require("./notification.routes");

module.exports = {
    name: "notification",
    routes,
    initialize() {
        console.log("[NOTIFICATION MODULE] Initialized");
    }
};
