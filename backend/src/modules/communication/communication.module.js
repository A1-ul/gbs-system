"use strict";

/*
==================================================
COMMUNICATION MODULE
ENTERPRISE HARDENED
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

let routes = null;

/*
==================================================
SAFE ROUTE LOADING
==================================================
*/

try {

    routes =
        require(
            "./communication.routes"
        );

} catch (error) {

    console.error(
        "[COMMUNICATION MODULE] ROUTE LOAD FAILURE:",
        error.message
    );

    routes = null;
}

/*
==================================================
VALIDATE ROUTES
==================================================
*/

function validateRoutes() {

    if (!routes) {

        return false;
    }

    if (
        typeof routes !== "function" &&
        typeof routes !== "object"
    ) {

        return false;
    }

    return true;
}

/*
==================================================
INITIALIZER
==================================================
*/

function initialize() {

    try {

        console.log(
            "[COMMUNICATION MODULE] INITIALIZED"
        );

        return true;

    } catch (error) {

        console.error(
            "[COMMUNICATION MODULE] INITIALIZATION FAILURE:",
            error.message
        );

        return false;
    }
}

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        name:
            "communication",

        routes:
            validateRoutes()
                ? routes
                : null,

        initialize
    });