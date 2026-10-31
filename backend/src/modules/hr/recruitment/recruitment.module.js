"use strict";

const routes = require("./recruitment.routes");

module.exports = {
    name: "recruitment",
    routes,
    initialize() {
        console.log("[RECRUITMENT MODULE] Initialized");
    }
};
