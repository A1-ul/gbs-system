"use strict";

const client =
    require(
        "./government.client"
    );

const validator =
    require(
        "./government.validator"
    );

async function scheduleMeeting(
    payload = {}
) {

    const validation =
        validator.validateMeeting(
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

    return client.createMeeting(
        payload
    );
}

module.exports =
    Object.freeze({

        scheduleMeeting
    });