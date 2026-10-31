"use strict";

const client =
    require(
        "./zoom.client"
    );

const validator =
    require(
        "./zoom.validator"
    );

/*
====================================
CREATE MEETING
====================================
*/

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