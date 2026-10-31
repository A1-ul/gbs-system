"use strict";

/*
====================================
COMMONJS ONLY
====================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "CommonJS environment required"
    );
}

/*
====================================
ROUTE LOADING
====================================
*/

let routes = null;

try {

    routes =
        require(
            "./timetable.routes"
        );

} catch (error) {

    console.error(
        "[TIMETABLE MODULE] Route Load Failure:",
        error.message
    );
}

/*
====================================
MODULE EXPORT
====================================
*/

module.exports =
    Object.freeze({

        name:
            "timetable",

        version:
            "1.0.0",

        enabled:
            Boolean(routes),

        routes:
            routes || null,

        initialize() {

            console.log(
                "[TIMETABLE MODULE] Initialized"
            );

            return true;
        }
    });