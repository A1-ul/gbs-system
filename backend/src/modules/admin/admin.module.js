"use strict";

const routes =
    require(
        "./admin.routes"
    );

if (
    !routes ||
    typeof routes !==
        "function"
) {

    throw new Error(
        "Invalid admin routes export"
    );
}

module.exports =
    Object.freeze({

        name:
            "admin",

        routes
    });