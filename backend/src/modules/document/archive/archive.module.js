"use strict";

const routes =
    require(
        "./archive.routes"
    );

if (
    !routes ||
    typeof routes !==
        "function"
) {

    throw new Error(
        "Invalid archive routes export"
    );
}

module.exports =
    Object.freeze({

        name:
            "archive",

        routes
    });