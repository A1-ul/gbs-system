"use strict";

module.exports =
    Object.freeze({

        constants:
            require(
                "./event.constants"
            ),

        registry:
            require(
                "./event.registry"
            ),

        dispatcher:
            require(
                "./event.dispatcher"
            ),

        eventBus:
            require(
                "./eventBus"
            )
    });