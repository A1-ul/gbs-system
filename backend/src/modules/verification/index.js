"use strict";

/*
=========================================
COMMONJS ONLY
=========================================
*/

if (typeof module === "undefined") {
    throw new Error(
        "[VERIFICATION] CommonJS required"
    );
}

/*
=========================================
SAFE MODULE EXPORT
=========================================
*/

module.exports = Object.freeze({

    module:
        require("./verification.module"),

    controller:
        require("./verification.controller"),

    service:
        require("./verification.service"),

    repository:
        require("./verification.repository"),

    validator:
        require("./verification.validator"),

    routes:
        require("./verification.routes"),

    events:
        require("./verification.events")
});