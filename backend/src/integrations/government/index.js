"use strict";

module.exports =
    Object.freeze({

        client:
            require(
                "./government.client"
            ),

        service:
            require(
                "./googlemeet.service"
            ),

        validator:
            require(
                "./government.validator"
            )
    });