"use strict";

/*
==================================================
GBS RESULT MODULE
ENTERPRISE SAFE • CRASH RESISTANT
COMMONJS ONLY
==================================================
*/

const path = require("path");

let routes;

try {

    routes = require("./result.routes");

} catch (error) {

    console.error(
        "[RESULT MODULE LOAD ERROR]",
        error.message
    );

    throw new Error(
        `[RESULT MODULE] Failed to load result.routes.js -> ${error.message}`
    );
}

/*
==================================================
VALIDATE ROUTER
==================================================
*/

if (
    !routes ||
    typeof routes !== "function" ||
    typeof routes.use !== "function"
) {
    throw new Error(
        "[RESULT MODULE] Invalid Express Router export from result.routes.js"
    );
}

/*
==================================================
INITIALIZER
==================================================
*/

function initialize() {

    console.log(
        "[RESULT MODULE] Initialized"
    );

    return true;
}

/*
==================================================
EXPORT
==================================================
*/

module.exports = Object.freeze({

    name: "result",

    version: "1.0.0",

    description:
        "GBS Result Management Module",

    routes,

    initialize
});