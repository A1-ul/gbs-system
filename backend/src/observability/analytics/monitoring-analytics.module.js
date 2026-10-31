"use strict";

const routes =
    require(
        "./analytics_ownership.routes"
    );

if (
    !routes ||
    typeof routes !==
        "function"
) {

    throw new Error(
        "Invalid analytics routes export"
    );
}

module.exports =
    Object.freeze({

        name:
            "analytics",

        routes
    });