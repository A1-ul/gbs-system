"use strict";

let routes = null;

try {

    routes =
        require("./calendar.routes");

} catch (error) {

    console.error(
        "[CALENDAR MODULE] ROUTE LOAD FAILURE:",
        error.message
    );
}

function initialize() {

    console.log(
        "[CALENDAR MODULE] INITIALIZED"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            "calendar",

        routes,

        initialize
    });