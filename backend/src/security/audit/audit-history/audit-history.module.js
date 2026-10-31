"use strict";

/*
=========================================
GBS ENTERPRISE AUDITLOG MODULE
COMMONJS ONLY
CRASH RESISTANT
=========================================
*/

let routes = null;

try {

    routes =
        require(
            "./audit-history.routes"
        );

} catch (error) {

    console.error(
        "[AUDITLOG_MODULE_LOAD_ERROR]",
        error.message
    );
}

function initialize() {

    console.log(
        "AuditLog module initialized"
    );
}

module.exports =
    Object.freeze({

        name:
            "auditlog",

        routes,

        initialize
    });