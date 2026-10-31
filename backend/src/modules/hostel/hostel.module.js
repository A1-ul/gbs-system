"use strict";

const routes = require("./hostel.routes");

module.exports = {
    name: "hostel",
    routes,
    initialize() {
        console.log("[HOSTEL MODULE] Initialized");
    }
};
