"use strict";

module.exports =
    Object.freeze({

        client:
            require(
                "./firebase.client"
            ),

        auth:
            require(
                "./firebase.auth"
            ),

        storage:
            require(
                "./firebase.storage"
            ),

        messaging:
            require(
                "./firebase.messaging"
            )
    });