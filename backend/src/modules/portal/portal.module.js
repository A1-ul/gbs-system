"use strict";

const routes =
    require("./portal.routes");

if (
    !routes ||
    typeof routes !== "function"
) {
    throw new Error(
        "Portal routes export invalid"
    );
}

function initialize() {

    console.log(
        "[PORTAL MODULE] Initialized"
    );
}

module.exports =
    Object.freeze({
        name: "portal",
        routes,
        initialize
    });