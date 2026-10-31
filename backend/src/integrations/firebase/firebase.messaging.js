"use strict";

async function sendNotification(
    payload = {}
) {

    return {

        success:
            true,

        delivered:
            true,

        payload
    };
}

module.exports =
    Object.freeze({

        sendNotification
    });