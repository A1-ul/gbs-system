"use strict";

const jobs =
    require(
        "./queue.jobs"
    );

async function enqueueBackup(
    payload
) {

    jobs.addJob({

        type:
            "BACKUP",

        payload,

        createdAt:
            new Date()
                .toISOString()
    });

    return true;
}

module.exports =
    Object.freeze({

        enqueueBackup
    });