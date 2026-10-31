"use strict";

/*
==================================================
DOCUMENT MODULE
ENTERPRISE HARDENED
COMMONJS ONLY
==================================================
*/

let routes = null;

try {

    routes =
        require(
            "./document.routes"
        );

} catch (error) {

    console.error(

        "[DOCUMENT MODULE] ROUTE LOAD FAILURE:",

        error.message
    );
}

module.exports =
    Object.freeze({

        name:
            "document",

        routes:
            routes || null,

        initialize() {

            console.log(
                "Document module initialized"
            );

            return true;
        }
    });