"use strict";

let routes = null;

try {

    routes =
        require(
            "./audit.routes"
        );

} catch (error) {

    console.error(
        "AUDIT ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports = Object.freeze({

    name:
        "audit",

    routes:
        routes || null,

    initialize:
        function initialize() {

            console.log(
                "Audit module initialized"
            );
        }
});