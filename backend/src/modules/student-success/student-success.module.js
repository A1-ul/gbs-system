"use strict";

const routes = require("./student-success.routes");

module.exports = {
    name: "student-success",
    basePath: "/api/v1/student-success",
    routes,
    initialize() {
        console.log("[STUDENT-SUCCESS MODULE] Initialized");
    }
};
