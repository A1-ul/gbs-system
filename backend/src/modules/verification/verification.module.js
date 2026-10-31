"use strict";

if (typeof module === "undefined") {
    throw new Error(
        "[VERIFICATION MODULE] CommonJS required"
    );
}

const routes =
    require(
        "./verification.routes"
    );

if (
    typeof routes !==
    "function"
) {

    throw new Error(
        "[VERIFICATION MODULE] Invalid routes export"
    );
}

module.exports =
    Object.freeze({

        name:
            "verification",

        version:
            "1.0.0",

        enabled:
            true,

        routes,

        initialize() {

            console.log(
                "[VERIFICATION MODULE] Initialized"
            );

            return true;
        }
    });