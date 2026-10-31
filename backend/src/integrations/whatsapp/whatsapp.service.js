"use strict";

const client =
    require(
        "./whatsapp.client"
    );

const validator =
    require(
        "./whatsapp.validator"
    );

async function send(
    payload = {}
) {

    const validation =
        validator.validateWhatsApp(
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

    return client.sendWhatsApp(
        payload
    );
}

module.exports =
    Object.freeze({

        send
    });