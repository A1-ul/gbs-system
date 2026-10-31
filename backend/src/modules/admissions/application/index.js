"use strict";

/*
==================================================
GBS ENTERPRISE APPLICATION MODULE
CRASH SAFE
COMMONJS ONLY
==================================================
*/

const routes =
    require("./application.routes");

if (
    !routes ||
    typeof routes !== "function"
) {
    throw new Error(
        "Application routes export invalid"
    );
}

module.exports =
    Object.freeze({

        name:
            "application",

        routes,

        initialize() {

            return true;
        }
    });