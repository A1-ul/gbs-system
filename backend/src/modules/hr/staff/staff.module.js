"use strict";

let routes = null;

try {

    routes =
        require(
            "./staff.routes"
        );

} catch (error) {

    console.error(
        "[STAFF MODULE LOAD ERROR]",
        error
    );
}

function initialize() {

    console.log(
        "[STAFF MODULE] Initialized"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            "staff",

        version:
            "1.0.0",

        routes,

        initialize
    });