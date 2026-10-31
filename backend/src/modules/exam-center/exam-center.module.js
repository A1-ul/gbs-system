"use strict";

const routes = require("./exam-center.routes");

module.exports = {
    name: "exam-center",
    routes,
    initialize() {
        console.log("[EXAM-CENTER MODULE] Initialized");
    }
};
