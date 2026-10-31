"use strict";

module.exports =
    Object.freeze({

        role:
            require(
                "./role.policy"
            ),

        permission:
            require(
                "./permission.policy"
            ),

        ownership:
            require(
                "./ownership.policy"
            ),

        tenant:
            require(
                "./tenant.policy"
            )
    });