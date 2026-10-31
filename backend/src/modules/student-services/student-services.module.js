"use strict";

const routes = require("./student-services.routes");

module.exports = {
    name: "student-services",
    basePath: "/api/v1/student-services",
    routes,
    initialize() {
        console.log("[STUDENT-SERVICES MODULE] Initialized");
    }
};
