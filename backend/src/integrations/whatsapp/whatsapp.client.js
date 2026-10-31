"use strict";

async function sendWhatsApp(
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

        sendWhatsApp
    });