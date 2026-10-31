"use strict";

const routes =
    require(
        "./subject.routes"
    );

if (
    !routes ||
    typeof routes !==
        "function"
) {

    throw new Error(
        "Subject routes export invalid"
    );
}

module.exports =
    Object.freeze({

        name:
            "subject",

        version:
            "1.0.0",

        enabled:
            true,

        routes,

        initialize() {

            console.log(
                "[SUBJECT MODULE] Initialized"
            );
        }
    });