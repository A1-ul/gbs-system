"use strict";

module.exports =
    Object.freeze({

        controller:
            require("./receipt.controller"),

        service:
            require("./receipt.service"),

        repository:
            require("./receipt.repository"),

        validator:
            require("./receipt.validator"),

        routes:
            require("./receipt.routes"),

        module:
            require("./receipt.module"),

        events:
            require("./receipt.events")
    });