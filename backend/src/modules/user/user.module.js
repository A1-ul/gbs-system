"use strict";

/*

*/

let routes;

try {

routes = require("./user.routes");

if (
    !routes ||
    typeof routes !== "function" ||
    typeof routes.use !== "function"
) {

    throw new Error(
        "Invalid Express Router Export"
    );
}

} catch (error) {

console.error(
    "[USER MODULE LOAD FAILURE]",
    error
);

throw new Error(
    `[USER MODULE] Startup Failure: ${error.message}`
);

}

/*
MODULE CONTRACT

*/

function initialize() {

console.log(
    "[USER MODULE] Initialized"
);

return true;

}

module.exports = Object.freeze({

name: "user",

displayName: "User Management",

version: "1.0.0",

enabled: true,

/*
============================================
ROUTE CONTRACT
============================================
*/

basePath: "/api/v1/users",

routes,

initialize

});