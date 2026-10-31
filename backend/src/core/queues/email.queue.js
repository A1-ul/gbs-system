"use strict";

const jobs =
    require(
        "./queue.jobs"
    );

async function enqueueEmail(
    payload
) {

    jobs.addJob({

        type:
            "EMAIL",

        payload,

        createdAt:
            new Date()
                .toISOString()
    });

    return true;
}

module.exports =
    Object.freeze({

        enqueueEmail
    });