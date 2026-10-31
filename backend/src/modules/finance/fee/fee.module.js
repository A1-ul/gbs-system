"use strict";

const routes =
    require("./fee.routes");

function initialize() {

    console.log(
        "Fee module initialized"
    );
}

module.exports =
    Object.freeze({
        name: "fee",
        routes,
        initialize
    });