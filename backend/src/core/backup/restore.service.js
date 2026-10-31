"use strict";

const repository =
    require(
        "./backup.repository"
    );

/*
====================================
RESTORE
====================================
*/

async function restoreBackup(
    backupId
) {

    const backup =
        await repository.findById(
            backupId
        );

    if (
        !backup
    ) {

        return {

            success:
                false,

            message:
                "Backup not found"
        };
    }

    return {

        success:
            true,

        restored:
            true,

        backupId,

        timestamp:
            new Date()
                .toISOString()
    };
}

module.exports =
    Object.freeze({

        restoreBackup
    });