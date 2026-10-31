"use strict";

/*
====================================
ALUMNI MODULE
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

let routes = null;

try {

    routes =
        require("./alumni.routes");

} catch (error) {

    console.error(
        "[ALUMNI MODULE LOAD ERROR]",
        error.message
    );
}

function initialize() {

    console.log(
        "Alumni module initialized"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            "alumni",

        routes:
            routes,

        initialize
    });