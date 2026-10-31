"use strict";

async function createMeeting(
    payload = {}
) {

    return {

        success:
            true,

        meetingId:
            "GM-" +
            Date.now(),

        meetingUrl:
            "https://meet.google.com/" +
            Date.now(),

        payload
    };
}

module.exports =
    Object.freeze({

        createMeeting
    });