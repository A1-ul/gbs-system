"use strict";

/*
=========================================
ACCOUNTANT MODULE
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const routes =
    require("./accountant.routes");

function initialize() {

    console.log(
        "[ACCOUNTANT MODULE] Initialized"
    );
}

module.exports =
    Object.freeze({

        name:
            "accountant",

        routes,

        initialize
    });