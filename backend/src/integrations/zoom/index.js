"use strict";

module.exports =
    Object.freeze({

        client:
            require(
                "./zoom.client"
            ),

        service:
            require(
                "./zoom.service"
            ),

        validator:
            require(
                "./zoom.validator"
            )
    });