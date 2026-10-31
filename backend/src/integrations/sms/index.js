"use strict";

module.exports =
    Object.freeze({

        client:
            require(
                "./sms.client"
            ),

        service:
            require(
                "./sms.service"
            ),

        validator:
            require(
                "./sms.validator"
            )
    });