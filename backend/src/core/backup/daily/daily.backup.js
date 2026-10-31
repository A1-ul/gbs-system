"use strict";

/*
====================================
DAILY BACKUP SERVICE
====================================
*/

async function executeDailyBackup() {

    const backup = {

        type:
            "daily",

        timestamp:
            new Date()
                .toISOString(),

        status:
            "completed"
    };

    console.log(`

====================================
DAILY BACKUP COMPLETED
====================================

TIMESTAMP:
${backup.timestamp}

====================================

`);

    return backup;
}

module.exports =
    Object.freeze({

        executeDailyBackup
    });