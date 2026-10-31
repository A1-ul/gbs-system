"use strict";

const jobs =
    require(
        "./queue.jobs"
    );

async function enqueueMeeting(
    payload
) {

    jobs.addJob({

        type:
            "MEETING",

        payload,

        createdAt:
            new Date()
                .toISOString()
    });

    return true;
}

module.exports =
    Object.freeze({

        enqueueMeeting
    });