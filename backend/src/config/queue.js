"use strict";

/*
====================================
QUEUE STORAGE
====================================
*/

const jobs =
    [];

const MAX_JOBS =
    10000;

let initialized =
    false;

/*
====================================
INITIALIZE
====================================
*/

async function initializeQueue() {

    if (
        initialized
    ) {

        return true;
    }

    initialized =
        true;

    console.log(`

====================================
QUEUE INITIALIZED
====================================

MAX JOBS : ${MAX_JOBS}

====================================

`);

    return true;
}

/*
====================================
GENERATE JOB ID
====================================
*/

function generateJobId() {

    return (
        Date.now()
        + "-"
        + Math.random()
            .toString(36)
            .substring(2, 10)
    );
}

/*
====================================
ADD JOB
====================================
*/

async function addJob(
    name,
    payload = {}
) {

    try {

        if (
            !initialized
        ) {

            await initializeQueue();
        }

        if (
            typeof name !==
            "string" ||
            !name.trim()
        ) {

            throw new Error(
                "Invalid job name"
            );
        }

        if (
            jobs.length >=
            MAX_JOBS
        ) {

            jobs.shift();
        }

        const job =
            Object.freeze({

                id:
                    generateJobId(),

                name:
                    name.trim(),

                payload,

                status:
                    "queued",

                attempts:
                    0,

                createdAt:
                    new Date()
                        .toISOString()
            });

        jobs.push(
            job
        );

        return job;

    } catch (
        error
    ) {

        console.error(
            "QUEUE ADD JOB ERROR:"
        );

        console.error(
            error.message
        );

        return null;
    }
}

/*
====================================
GET JOB
====================================
*/

function getJobById(
    id
) {

    return (
        jobs.find(
            function (
                job
            ) {

                return (
                    job.id ===
                    id
                );
            }
        ) ||
        null
    );
}

/*
====================================
GET ALL JOBS
====================================
*/

function getJobs() {

    return [
        ...jobs
    ];
}

/*
====================================
COUNT
====================================
*/

function getJobCount() {

    return jobs.length;
}

/*
====================================
CLEAR
====================================
*/

function clearJobs() {

    jobs.length = 0;

    return true;
}

/*
====================================
STATUS
====================================
*/

function getQueueStatus() {

    return Object.freeze({

        initialized,

        totalJobs:
            jobs.length,

        maxJobs:
            MAX_JOBS
    });
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        initializeQueue,

        addJob,

        getJobById,

        getJobs,

        getJobCount,

        clearJobs,

        getQueueStatus
    });