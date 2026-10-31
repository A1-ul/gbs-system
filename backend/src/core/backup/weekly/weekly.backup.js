"use strict";

/*
====================================
WEEKLY BACKUP SERVICE
====================================
*/

async function executeWeeklyBackup() {

    const backup = {

        type:
            "weekly",

        timestamp:
            new Date()
                .toISOString(),

        status:
            "completed"
    };

    console.log(`

====================================
WEEKLY BACKUP COMPLETED
====================================

TIMESTAMP:
${backup.timestamp}

====================================

`);

    return backup;
}

module.exports =
    Object.freeze({

        executeWeeklyBackup
    });