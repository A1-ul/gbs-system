"use strict";

const routes =
    require("./receipt.routes");

if (
    typeof routes !== "function"
) {
    throw new Error(
        "Receipt routes export invalid"
    );
}

function initialize() {

    console.log(
        "[RECEIPT MODULE] Initialized"
    );
}

module.exports =
    Object.freeze({

        name: "receipt",

        routes,

        initialize
    });