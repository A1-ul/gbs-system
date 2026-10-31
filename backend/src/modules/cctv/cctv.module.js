"use strict";

let routes = null;

try {

    routes =
        require("./cctv.routes");

} catch (error) {

    console.error(
        "[CCTV MODULE] ROUTE LOAD FAILURE:",
        error.message
    );
}

function initialize() {

    console.log(
        "[CCTV MODULE] INITIALIZED"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            "cctv",

        routes,

        initialize
    });