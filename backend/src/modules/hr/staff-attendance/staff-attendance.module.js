"use strict";

let routes = null;

try {

    routes =
        require(
            "./staff-attendance.routes"
        );

    if (
        !routes ||
        typeof routes !==
            "function"
    ) {

        throw new Error(
            "Invalid attendance routes export"
        );
    }

} catch (error) {

    console.error(
        "ATTENDANCE MODULE LOAD ERROR:",
        error.message
    );

    routes = null;
}

module.exports =
    Object.freeze({

        name:
            "attendance",

        version:
            "1.0.0",

        enabled:
            true,

        routes
    });