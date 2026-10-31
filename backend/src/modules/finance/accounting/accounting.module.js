"use strict";

let routes = null;

try {

    routes =
        require(
            "./accountant.routes"
        );

} catch (error) {

    console.error(
        "ACCOUNTANT ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports = Object.freeze({

    name:
        "accountant",

    routes:
        routes || null,

    initialize:
        function initialize() {

            console.log(
                "Accountant module initialized"
            );
        }
});