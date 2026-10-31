"use strict";

const routes = require("./whatsapp.routes");

module.exports = {
    name: "whatsapp",
    routes,
    initialize() {
        console.log("[WHATSAPP MODULE] Initialized");
    }
};
