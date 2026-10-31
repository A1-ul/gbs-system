"use strict";

const client =
    require(
        "./sms.client"
    );

const validator =
    require(
        "./sms.validator"
    );

async function send(
    payload = {}
) {

    const validation =
        validator.validateSMS(
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

    return client.sendSMS(
        payload
    );
}

module.exports =
    Object.freeze({

        send
    });