"use strict";

/*
==================================================
DASHBOARD MODULE
ENTERPRISE HARDENED
COMMONJS ONLY
==================================================
*/

let routes = null;

try {

    routes =
        require(
            "./dashboard.routes"
        );

} catch (error) {

    console.error(

        "[DASHBOARD MODULE] ROUTE LOAD FAILURE:",

        error.message
    );
}

module.exports =
    Object.freeze({

        name:
            "dashboard",

        routes:
            routes || null,

        initialize() {

            console.log(
                "Dashboard module initialized"
            );

            return true;
        }
    });