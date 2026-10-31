"use strict";

let routes = null;

try {

    routes =
        require(
            "./approval.routes"
        );

} catch (error) {

    console.error(
        "APPROVAL ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports = Object.freeze({

    name:
        "approval",

    routes:
        routes || null,

    initialize:
        function initialize() {

            console.log(
                "Approval module initialized"
            );
        }
});