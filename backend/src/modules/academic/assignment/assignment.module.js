"use strict";

let routes = null;

try {

    routes =
        require("./assignment.routes");

    if (
        !routes ||
        typeof routes !== "function"
    ) {

        throw new Error(
            "Invalid assignment routes export"
        );
    }

} catch (error) {

    console.error(
        "ASSIGNMENT MODULE LOAD ERROR:",
        error.message
    );

    routes = null;
}

function initialize() {

    try {

        console.log(
            "Assignment module initialized"
        );

        return true;

    } catch (error) {

        console.error(
            "ASSIGNMENT INITIALIZATION ERROR:",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        name:
            "assignment",

        routes,

        initialize
    });