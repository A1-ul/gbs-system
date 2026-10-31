"use strict";

/*
=========================================
TEACHER MODULE
ENTERPRISE HARDENED
COMMONJS ONLY
=========================================
*/

let routes = null;

/*
=========================================
SAFE ROUTE LOADER
=========================================
*/

try {

    routes =
        require(
            "./teacher.routes"
        );

} catch (error) {

    console.error(

        "[TEACHER MODULE]",

        "Route Load Failure:",

        error.message
    );

    routes = null;
}

/*
=========================================
MODULE DEFINITION
=========================================
*/

const moduleDefinition =
    Object.freeze({

        name:
            "teacher",

        version:
            "1.0.0",

        enabled:
            true,

        routes,

        initialize() {

            try {

                console.log(
                    "[TEACHER MODULE] Initialized"
                );

                return true;

            } catch (error) {

                console.error(

                    "[TEACHER MODULE]",

                    "Initialization Failure:",

                    error.message
                );

                return false;
            }
        }
    });

/*
=========================================
EXPORT
=========================================
*/

module.exports =
    moduleDefinition;