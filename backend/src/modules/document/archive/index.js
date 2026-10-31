"use strict";

let routes = null;

try {

    routes =
        require(
            "./archive.routes"
        );

    if (
        !routes ||
        typeof routes !== "function"
    ) {

        throw new Error(
            "Invalid archive routes export"
        );
    }

} catch (error) {

    console.error(
        "ARCHIVE MODULE LOAD ERROR:",
        error.message
    );

    routes = null;
}

function initialize() {

    try {

        console.log(
            "Archive module initialized"
        );

        return true;

    } catch (error) {

        console.error(
            "ARCHIVE INITIALIZATION ERROR:",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        name:
            "archive",

        routes,

        initialize
    });