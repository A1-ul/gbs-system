"use strict";

let routes = null;

try {

    routes =
        require(
            "./reports.routes"
        );

} catch (error) {

    console.error(
        "[REPORTS MODULE] ROUTE LOAD FAILURE:",
        error.message
    );
}

module.exports =
    Object.freeze({

        name:
            "reports",

        version:
            "1.0.0",

        routes:
            routes || null,

        initialize() {

            console.log(
                "[REPORTS MODULE] INITIALIZED"
            );
        }
    });