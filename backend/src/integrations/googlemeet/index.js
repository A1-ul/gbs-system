"use strict";

module.exports =
    Object.freeze({

        client:
            require(
                "./googlemeet.client"
            ),

        service:
            require(
                "./googlemeet.service"
            ),

        validator:
            require(
                "./googlemeet.validator"
            )
    });