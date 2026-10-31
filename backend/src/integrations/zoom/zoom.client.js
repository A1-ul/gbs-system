"use strict";

/*
====================================
ZOOM CLIENT
====================================
*/

let initialized =
    false;

function initialize() {

    initialized =
        true;

    return true;
}

function isInitialized() {

    return initialized;
}

async function createMeeting(
    payload = {}
) {

    return {

        success:
            true,

        meetingId:
            "ZOOM-" +
            Date.now(),

        joinUrl:
            "https://zoom.us/j/" +
            Date.now(),

        payload
    };
}

module.exports =
    Object.freeze({

        initialize,

        isInitialized,

        createMeeting
    });