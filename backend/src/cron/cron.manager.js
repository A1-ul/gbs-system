"use strict";

/*
====================================
CRON MANAGER
ENTERPRISE SAFE
COMMONJS ONLY
====================================
*/

const jobs =
    new Map();

let isRunning =
    false;

/*
====================================
REGISTER JOB
====================================
*/

function registerJob(
    name,
    handler,
    intervalMs
) {

    if (
        isRunning
    ) {

        console.warn(
            `⚠ Cannot register job while manager is running: ${name}`
        );

        return false;
    }

    if (
        typeof name !== "string" ||
        !name.trim()
    ) {

        throw new Error(
            "Job name is required"
        );
    }

    if (
        typeof handler !==
        "function"
    ) {

        throw new Error(
            `Invalid handler for job: ${name}`
        );
    }

    if (
        !Number.isInteger(
            intervalMs
        ) ||
        intervalMs < 1000
    ) {

        throw new Error(
            `Invalid interval for job: ${name}`
        );
    }

    if (
        jobs.has(name)
    ) {

        console.warn(
            `⚠ Job already registered: ${name}`
        );

        return false;
    }

    jobs.set(name, {

        name:
            name.trim(),

        handler,

        intervalMs,

        timer:
            null,

        running:
            false,

        failures:
            0,

        lastRun:
            null,

        lastError:
            null,

        createdAt:
            new Date()
                .toISOString()
    });

    console.log(
        `✅ Job registered: ${name}`
    );

    return true;
}

/*
====================================
START SINGLE JOB
====================================
*/

function startJob(
    job
) {

    if (
        !job ||
        job.timer
    ) {

        return;
    }

    job.timer =
        setInterval(
            async function () {

                if (
                    job.running
                ) {

                    return;
                }

                job.running =
                    true;

                try {

                    await Promise.resolve(
                        job.handler()
                    );

                    job.lastRun =
                        new Date()
                            .toISOString();

                    job.failures =
                        0;

                    job.lastError =
                        null;

                } catch (
                    error
                ) {

                    job.failures += 1;

                    job.lastError =
                        error &&
                        error.message
                            ? error.message
                            : "Unknown job failure";

                    console.error(`
====================================
❌ JOB FAILED
====================================
JOB: ${job.name}
ERROR: ${job.lastError}
FAILURES: ${job.failures}
====================================
`);

                } finally {

                    job.running =
                        false;
                }

            },
            job.intervalMs
        );
}

/*
====================================
START MANAGER
====================================
*/

function startManager() {

    if (
        isRunning
    ) {

        return true;
    }

    isRunning =
        true;

    for (
        const job
        of jobs.values()
    ) {

        startJob(
            job
        );
    }

    console.log(`
====================================
✅ CRON MANAGER STARTED
====================================
JOBS: ${jobs.size}
====================================
`);

    return true;
}

/*
====================================
STOP MANAGER
====================================
*/

function stopManager() {

    for (
        const job
        of jobs.values()
    ) {

        if (
            job.timer
        ) {

            clearInterval(
                job.timer
            );

            job.timer =
                null;
        }

        job.running =
            false;
    }

    isRunning =
        false;

    console.log(`
====================================
🛑 CRON MANAGER STOPPED
====================================
`);

    return true;
}

/*
====================================
REMOVE JOB
====================================
*/

function removeJob(
    name
) {

    if (
        typeof name !==
        "string"
    ) {

        return false;
    }

    const job =
        jobs.get(name);

    if (
        !job
    ) {

        return false;
    }

    if (
        job.timer
    ) {

        clearInterval(
            job.timer
        );

        job.timer =
            null;
    }

    return jobs.delete(
        name
    );
}

/*
====================================
GET JOB
====================================
*/

function getJob(
    name
) {

    const job =
        jobs.get(name);

    if (
        !job
    ) {

        return null;
    }

    return {

        name:
            job.name,

        intervalMs:
            job.intervalMs,

        running:
            job.running,

        failures:
            job.failures,

        lastRun:
            job.lastRun,

        lastError:
            job.lastError,

        createdAt:
            job.createdAt
    };
}

/*
====================================
GET JOBS
====================================
*/

function getJobs() {

    return Array.from(
        jobs.values()
    ).map(
        function (
            job
        ) {

            return {

                name:
                    job.name,

                intervalMs:
                    job.intervalMs,

                running:
                    job.running,

                failures:
                    job.failures,

                lastRun:
                    job.lastRun,

                lastError:
                    job.lastError,

                createdAt:
                    job.createdAt
            };
        }
    );
}

/*
====================================
STATUS
====================================
*/

function getStatus() {

    let activeJobs =
        0;

    for (
        const job
        of jobs.values()
    ) {

        if (
            job.running
        ) {

            activeJobs++;
        }
    }

    return {

        running:
            isRunning,

        totalJobs:
            jobs.size,

        activeJobs,

        timestamp:
            new Date()
                .toISOString()
    };
}

/*
====================================
CLEAR JOBS
====================================
*/

function clearJobs() {

    stopManager();

    jobs.clear();

    return true;
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        registerJob,

        removeJob,

        getJob,

        getJobs,

        clearJobs,

        startManager,

        stopManager,

        getStatus
    });