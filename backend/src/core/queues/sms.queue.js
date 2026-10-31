"use strict";

const jobs =
    require(
        "./queue.jobs"
    );

async function enqueueSms(
    payload
) {

    jobs.addJob({

        type:
            "SMS",

        payload,

        createdAt:
            new Date()
                .toISOString()
    });

    return true;
}

module.exports =
    Object.freeze({

        enqueueSms
    });