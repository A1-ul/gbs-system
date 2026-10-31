"use strict";

const backupService =
    require(
        "./backup.service"
    );

const restoreService =
    require(
        "./restore.service"
    );

const scheduler =
    require(
        "./backup.scheduler"
    );

/*
====================================
MANAGER
====================================
*/

function initialize() {

    scheduler.startScheduler();

    return true;
}

module.exports =
    Object.freeze({

        initialize,

        backupService,

        restoreService,

        scheduler
    });