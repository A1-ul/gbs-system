"use strict";

const backupService =
    require(
        "./backup.service"
    );

let initialized =
    false;

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
BACKUP SCHEDULER ACTIVE
====================================

`);

    return true;
}

/*
====================================
RUN DAILY
====================================
*/

async function runDailyBackup() {

    return backupService.createBackup(
        "daily"
    );
}

module.exports =
    Object.freeze({

        startScheduler,

        runDailyBackup
    });