"use strict";

let routes = null;

try {

    routes =
        require(
            "./application.routes"
        );

} catch (error) {

    console.error(
        "APPLICATION ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports = Object.freeze({

    name:
        "application",

    routes:
        routes || null,

    initialize:
        function initialize() {

            console.log(
                "Application module initialized"
            );
        }
});