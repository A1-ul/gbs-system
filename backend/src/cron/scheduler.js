"use strict";

/*
====================================
CRON SCHEDULER
====================================
*/

let initialized =
    false;

let jobs =
    [];

/*
====================================
REGISTER JOB
====================================
*/

function registerJob(
    name,
    handler
) {

    if (

        typeof name !==
        "string" ||

        !name.trim()

    ) {

        return false;
    }

    if (
        typeof handler !==
        "function"
    ) {

        return false;
    }

    jobs.push({

        name,

        handler,

        createdAt:
            new Date()
                .toISOString()
    });

    return true;
}

/*
====================================
START
====================================
*/

function startScheduler() {

    if (
        initialized
    ) {

        return true;
    }

    initialized =
        true;

    console.log(`

====================================
CRON SCHEDULER STARTED
====================================

Registered Jobs:
${jobs.length}

====================================

`);

    return true;
}

/*
====================================
RUN JOB
====================================
*/

async function runJob(
    name
) {

    const job =
        jobs.find(

            function (
                item
            ) {

                return (
                    item.name ===
                    name
                );
            }
        );

    if (
        !job
    ) {

        return false;
    }

    try {

        await job.handler();

        return true;

    } catch (
        error
    ) {

        console.error(

            `CRON JOB FAILED: ${name}`
        );

        console.error(
            error.message
        );

        return false;
    }
}

/*
====================================
STATUS
====================================
*/

function getSchedulerStatus() {

    return {

        initialized,

        jobs:
            jobs.length,

        timestamp:
            new Date()
                .toISOString()
    };
}

module.exports =
    Object.freeze({

        registerJob,

        startScheduler,

        runJob,

        getSchedulerStatus
    });