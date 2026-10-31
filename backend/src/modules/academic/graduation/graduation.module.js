"use strict";

let routes = null;

try {

    routes =
        require(
            "./graduation.routes"
        );

} catch (error) {

    console.error(
        "GRADUATE ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports =
    Object.freeze({

        name: "graduate",

        routes:
            routes || null,

        initialize() {

            console.log(
                "Graduate module initialized"
            );
        }
    });