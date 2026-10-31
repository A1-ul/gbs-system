"use strict";

const authModule =
    require("./auth.module");

function initialize() {

    console.log(
        "[AUTH] Module initialized"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            authModule.name,

        routes:
            authModule.routes,

        initialize
    });