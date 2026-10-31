"use strict";

let routes = null;

try {

    routes =
        require("./classroom.routes");

} catch (error) {

    console.error(
        "[CLASSROOM MODULE] ROUTE LOAD FAILURE:",
        error.message
    );
}

function initialize() {

    console.log(
        "[CLASSROOM MODULE] INITIALIZED"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            "classroom",

        routes,

        initialize
    });