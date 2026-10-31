"use strict";

/*
=========================================
GBS ENTERPRISE AUDIT MODULE
COMMONJS ONLY
CRASH RESISTANT
=========================================
*/

let routes = null;

try {

    routes =
        require(
            "./audit.routes"
        );

} catch (error) {

    console.error(
        "[AUDIT_MODULE_LOAD_ERROR]",
        error.message
    );
}

function initialize() {

    console.log(
        "Audit module initialized"
    );
}

module.exports =
    Object.freeze({

        name:
            "audit",

        routes,

        initialize
    });