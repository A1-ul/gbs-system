"use strict";

let routes = null;

try {

    routes =
        require(
            "./academic.routes"
        );

} catch (error) {

    console.error(
        "ACADEMIC ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports = {
    name:
        "academic",

    routes:
        routes || null,

    initialize:
        function initialize() {

            console.log(
                "Academic module initialized"
            );
        }
};