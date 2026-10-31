"use strict";

const repository =
    require(
        "./backup.repository"
    );

/*
====================================
GENERATE ID
====================================
*/

function generateId() {

    return (
        Date.now()
        + "-"
        + Math.random()
            .toString(36)
            .slice(2, 10)
    );
}

/*
====================================
CREATE BACKUP
====================================
*/

async function createBackup(
    type = "manual"
) {

    const backup = {

        id:
            generateId(),

        type,

        status:
            "completed",

        createdAt:
            new Date()
                .toISOString()
    };

    await repository.create(
        backup
    );

    return backup;
}

/*
====================================
LIST
====================================
*/

async function getBackups() {

    return repository.findAll();
}

/*
====================================
STATUS
====================================
*/

async function getBackupStatus() {

    return {

        total:
            await repository.count(),

        timestamp:
            new Date()
                .toISOString()
    };
}

module.exports =
    Object.freeze({

        createBackup,

        getBackups,

        getBackupStatus
    });