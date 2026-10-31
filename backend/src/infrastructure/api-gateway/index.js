"use strict";

module.exports =
    Object.freeze({

        controller:
            require(
                "./gateway.controller"
            ),

        routes:
            require(
                "./gateway.routes"
            ),

        service:
            require(
                "./gateway.service"
            ),

        registry:
            require(
                "./gateway.registry"
            ),

        health:
            require(
                "./gateway.health"
            )
    });