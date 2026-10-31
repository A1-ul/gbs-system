"use strict";

const routes =
    require("./approval.routes");

if (
    !routes ||
    typeof routes !== "function"
) {
    throw new Error(
        "Invalid approval routes export"
    );
}

module.exports =
    Object.freeze({

        name:
            "approval",

        routes
    });