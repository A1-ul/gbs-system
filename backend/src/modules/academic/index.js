"use strict";

/*
=========================================
ACADEMIC MODULE ENTRY
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const logger =
    require("../../utils/logger");

let routes = null;

try {

    routes =
        require("./academic.routes");

} catch (error) {

    logger.error(
        "ACADEMIC_ROUTE_LOAD_FAILED",
        {
            message:
                error.message,
            stack:
                error.stack
        }
    );
}

function initialize() {

    logger.info(
        "ACADEMIC_MODULE_INITIALIZED"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            "academic",

        routes,

        initialize
    });