"use strict";

module.exports =
    Object.freeze({

        client:
            require(
                "./whatsapp.client"
            ),

        service:
            require(
                "./whatsapp.service"
            ),

        validator:
            require(
                "./whatsapp.validator"
            )
    });