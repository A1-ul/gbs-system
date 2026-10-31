"use strict";

const routes = require("./chat.routes");

module.exports = {
    name: "chat",
    routes,
    initialize() {
        console.log("[CHAT MODULE] Initialized");
    }
};
