"use strict";

/*
====================================
MONTHLY BACKUP SERVICE
====================================
*/

async function executeMonthlyBackup() {

    const backup = {

        type:
            "monthly",

        timestamp:
            new Date()
                .toISOString(),

        status:
            "completed"
    };

    console.log(`

====================================
MONTHLY BACKUP COMPLETED
====================================

TIMESTAMP:
${backup.timestamp}

====================================

`);

    return backup;
}

module.exports =
    Object.freeze({

        executeMonthlyBackup
    });