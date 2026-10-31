"use strict";

let routes = null;

try {

    routes =
        require(
            "./permission.routes"
        );

} catch (error) {

    console.error(
        "PERMISSION ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports =
    Object.freeze({

        name:
            "permission",

        routes:
            routes || null,

        initialize() {

            console.log(
                "Permission module initialized"
            );
        }
    });