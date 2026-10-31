"use strict";

const routes = require("./lesson_plan.routes");

module.exports = {
    name: "lesson_plan",
    routes,
    initialize() {
        console.log("[LESSON_PLAN MODULE] Initialized");
    }
};
