"use strict";

let routes = null;

try {

    routes =
        require("./payroll.routes");

} catch (error) {

    console.error(
        "PAYROLL ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports =
    Object.freeze({

        name:
            "payroll",

        routes:
            routes || null,

        initialize() {

            console.log(
                "Payroll module initialized"
            );
        }
    });