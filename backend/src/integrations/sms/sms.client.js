"use strict";

async function sendSMS(
    payload = {}
) {

    return {

        success:
            true,

        provider:
            "internal",

        delivered:
            true,

        payload
    };
}

module.exports =
    Object.freeze({

        sendSMS
    });