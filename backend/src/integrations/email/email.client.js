"use strict";

async function send(
    payload = {}
) {

    return {

        success:
            true,

        provider:
            "internal",

        payload
    };
}

module.exports =
    Object.freeze({

        send
    });