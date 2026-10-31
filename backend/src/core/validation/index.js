"use strict";

module.exports =
    Object.freeze({

        requestValidator:
            require(
                "./request.validator"
            ),

        schemaValidator:
            require(
                "./schema.validator"
            ),

        validator:
            require(
                "./validator"
            )
    });