"use strict";

const client =
    require(
        "./email.client"
    );

const validator =
    require(
        "./email.validator"
    );

async function sendEmail(
    payload = {}
) {

    const validation =
        validator.validateEmailPayload(
            payload
        );

    if (
        !validation.valid
    ) {

        return {

            success:
                false,

            errors:
                validation.errors
        };
    }

    return client.send(
        payload
    );
}

module.exports =
    Object.freeze({

        sendEmail
    });