"use strict";

module.exports =
    Object.freeze({

        client:
            require(
                "./email.client"
            ),

        service:
            require(
                "./email.service"
            ),

        templates:
            require(
                "./email.templates"
            ),

        validator:
            require(
                "./email.validator"
            )
    });