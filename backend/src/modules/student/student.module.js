"use strict";

/*
=================================================
STUDENT MODULE
ENTERPRISE SAFE
COMMONJS ONLY
ROUTE CONTRACT ENFORCED
=================================================
*/

let routes = null;

/*
=================================================
LOAD ROUTES SAFELY
=================================================
*/

try {
    routes = require("./student.routes");

    if (
        !routes ||
        typeof routes !== "function" ||
        typeof routes.use !== "function" ||
        typeof routes.handle !== "function"
    ) {
        throw new Error("Invalid Express router export");
    }

} catch (error) {
    console.error(
        "[STUDENT MODULE] ROUTE LOAD FAILURE:",
        error.message
    );

    throw new Error(
        "[STUDENT MODULE] Cannot initialize without valid routes"
    );
}

/*
=================================================
MODULE DEFINITION
=================================================
*/

const moduleDefinition = Object.freeze({

    name: "student",

    version: "1.0.0",

    enabled: true,

    basePath: "/api/v1/students", // 🔥 CRITICAL FIX

    routes,

    initialize() {
        console.log("[STUDENT MODULE] INITIALIZED");
        return true;
    }
});

module.exports = moduleDefinition;