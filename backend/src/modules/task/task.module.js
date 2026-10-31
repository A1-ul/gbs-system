"use strict";

/*
=================================================
TASK MODULE
COMMONJS ONLY
ENTERPRISE SAFE
=================================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "CommonJS environment required"
    );
}

let routes = null;

try {

    routes =
        require(
            "./task.routes"
        );

} catch (error) {

    console.error(
        "[TASK MODULE] Route Load Failure:",
        error.message
    );
}

module.exports =
    Object.freeze({

        name:
            "task",

        version:
            "1.0.0",

        enabled:
            true,

        routes:
            routes || null,

        initialize() {

            console.log(
                "[TASK MODULE] Initialized"
            );
        }
    });