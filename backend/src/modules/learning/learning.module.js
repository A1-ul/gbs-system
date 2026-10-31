"use strict";

let routes = null;

try {

    routes =
        require(
            "./learning.routes"
        );

} catch (error) {

    console.error(
        "[LEARNING MODULE LOAD ERROR]",
        error
    );
}

module.exports =
    Object.freeze({

        name:
            "learning",

        routes,

        initialize() {

            console.log(
                "[MODULE] Learning initialized"
            );
        }
    });