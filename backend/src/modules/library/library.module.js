"use strict";

let routes = null;

try {

    routes =
        require(
            "./library.routes"
        );

} catch (error) {

    console.error(
        "[LIBRARY MODULE LOAD ERROR]",
        error
    );
}

module.exports =
    Object.freeze({

        name:
            "library",

        version:
            "1.0.0",

        routes,

        initialize() {

            console.log(
                "[MODULE] Library initialized"
            );
        }
    });