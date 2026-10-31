"use strict";

/*
=================================================
AUTH MODULE (FINAL CLEAN)
COMMONJS ONLY
ROUTE CONTRACT CONTROLLED BY MODULE LOADER
=================================================
*/

const routes = require("./auth.routes");

/*
=================================================
VALIDATION
=================================================
*/

function isExpressRouter(router) {
    return Boolean(
        router &&
        typeof router === "function" &&
        typeof router.use === "function"
    );
}

if (!isExpressRouter(routes)) {
    throw new Error(
        "[AUTH MODULE] Invalid router export"
    );
}

/*
=================================================
MODULE DEFINITION
=================================================
*/

module.exports = Object.freeze({

    name: "auth",

    version: "1.0.0",

    enabled: true,

    // IMPORTANT: ONLY SOURCE OF ROUTE TRUTH
    basePath: "/api/v1/auth",

    routes,

    initialize() {
        console.log("[AUTH MODULE] Initialized");
        return true;
    }
});