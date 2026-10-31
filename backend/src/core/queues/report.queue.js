"use strict";

const jobs =
    require(
        "./queue.jobs"
    );

async function enqueueReport(
    payload
) {

    jobs.addJob({

        type:
            "REPORT",

        payload,

        createdAt:
            new Date()
                .toISOString()
    });

    return true;
}

module.exports =
    Object.freeze({

        enqueueReport
    });