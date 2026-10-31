"use strict";

const userModule =
    require("./user.module");

function initialize() {

    console.log(
        "USER MODULE INITIALIZED"
    );

    return true;
}

module.exports =
    Object.freeze({

        name:
            userModule.name,

        routes:
            userModule.routes,

        initialize
    });