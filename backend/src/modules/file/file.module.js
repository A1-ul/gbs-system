"use strict";

const routes =
    require("./file.routes");

function initialize() {

    console.log(
        "File module initialized"
    );
}

module.exports =
    Object.freeze({
        name: "file",
        routes,
        initialize
    });