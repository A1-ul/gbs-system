"use strict";

const jobs =
    [];

function addJob(
    job
) {

    jobs.push(
        Object.freeze(
            job
        )
    );

    return true;
}

function getJobs() {

    return [
        ...jobs
    ];
}

function countJobs() {

    return jobs.length;
}

module.exports =
    Object.freeze({

        addJob,

        getJobs,

        countJobs
    });