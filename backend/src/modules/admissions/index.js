"use strict";

/*
=========================================
ADMISSION MODULE
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const logger =
    require("../../utils/logger");

let routes = null;

try {

    routes =
        require(
            "./admission.routes"
        );

} catch (error) {

    logger.error(
        "ADMISSION_ROUTE_LOAD_FAILURE",
        {
            message:
                error.message
        }
    );
}

module.exports =
    Object.freeze({

        name:
            "admission",

        routes,

        initialize:
            function initialize() {

                logger.info(
                    "ADMISSION_MODULE_INITIALIZED"
                );
            }
    });