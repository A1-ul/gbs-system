"use strict";

const jobs =
    require(
        "./queue.jobs"
    );

async function enqueueNotification(
    payload
) {

    jobs.addJob({

        type:
            "NOTIFICATION",

        payload,

        createdAt:
            new Date()
                .toISOString()
    });

    return true;
}

module.exports =
    Object.freeze({

        enqueueNotification
    });