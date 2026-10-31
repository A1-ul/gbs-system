"use strict";

let routes = null;

try {

    routes =
        require(
            "./role.routes"
        );

} catch (error) {

    console.error(
        "[ROLE MODULE LOAD ERROR]",
        error
    );
}

function initialize() {

    console.log(
        "[ROLE MODULE] Initialized"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            "role",

        version:
            "1.0.0",

        routes,

        initialize
    });