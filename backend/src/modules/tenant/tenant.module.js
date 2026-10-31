"use strict";

/*
=========================================
COMMONJS ONLY PROTECTION
=========================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "CommonJS environment required"
    );
}

/*
=========================================
ROUTES
=========================================
*/

const routes =
    require(
        "./tenant.routes"
    );

if (
    typeof routes !==
        "function"
) {

    throw new Error(
        "Invalid tenant.routes export"
    );
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        name:
            "tenant",

        version:
            "1.0.0",

        enabled:
            true,

        routes
    });