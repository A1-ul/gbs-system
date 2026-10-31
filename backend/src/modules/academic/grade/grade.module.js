"use strict";

let routes = null;

try {

    routes =
        require(
            "./grade.routes"
        );

} catch (error) {

    console.error(
        "[GRADE MODULE ROUTE LOAD ERROR]",
        error.message
    );
}

function initialize() {

    console.log(
        "[GRADE MODULE INITIALIZED]"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            "grade",

        routes,

        initialize
    });