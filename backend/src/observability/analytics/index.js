"use strict";

/*
=========================================
GBS ENTERPRISE ANALYTICS MODULE
COMMONJS ONLY
=========================================
*/

let routes = null;

try {

    routes =
        require("./analytics_ownership.routes");

} catch (error) {

    console.error(
        "ANALYTICS ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports =
    Object.freeze({

        name:
            "analytics",

        routes:
            routes || null,

        initialize:
            function initialize() {

                console.log(
                    "Analytics module initialized"
                );
            }
    });