"use strict";

async function verifyToken(
    token
) {

    if (
        !token
    ) {

        return {

            success:
                false,

            user:
                null
        };
    }

    return {

        success:
            true,

        user: {

            uid:
                "firebase-user",

            email:
                "user@example.com"
        }
    };
}

module.exports =
    Object.freeze({

        verifyToken
    });