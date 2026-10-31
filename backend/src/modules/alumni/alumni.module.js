"use strict";

let routes = null;

try {

    routes =
        require(
            "./alumni.routes"
        );

} catch (error) {

    console.error(
        "ALUMNI ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports = Object.freeze({

    name:
        "alumni",

    routes:
        routes || null,

    initialize:
        function initialize() {

            console.log(
                "Alumni module initialized"
            );
        }
});