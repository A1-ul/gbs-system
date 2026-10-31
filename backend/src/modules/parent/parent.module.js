"use strict";

let routes = null;

try {

    routes =
        require("./parent.routes");

} catch (error) {

    console.error(
        "PARENT ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports =
    Object.freeze({

        name:
            "parent",

        routes:
            routes || null,

        initialize() {

            console.log(
                "Parent module initialized"
            );
        }
    });