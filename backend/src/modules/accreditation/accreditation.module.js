"use strict";

const routes = require("./accreditation.routes");

module.exports = {
    name: "accreditation",
    basePath: "/api/v1/accreditation",
    routes,
    initialize() {
        console.log("[ACCREDITATION MODULE] Initialized");
    }
};
