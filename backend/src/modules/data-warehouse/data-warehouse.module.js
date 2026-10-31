"use strict";

const routes = require("./data-warehouse.routes");

module.exports = {
    name: "data-warehouse",
    basePath: "/api/v1/data-warehouse",
    routes,
    initialize() {
        console.log("[DATA-WAREHOUSE MODULE] Initialized");
    }
};
