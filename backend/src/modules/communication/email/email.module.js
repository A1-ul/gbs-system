"use strict";

const routes = require("./email.routes");

module.exports = {
    name: "email",
    routes,
    initialize() {
        console.log("[EMAIL MODULE] Initialized");
    }
};
