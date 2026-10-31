"use strict";

module.exports =
    Object.freeze({

        manager:
            require(
                "./backup.manager"
            ),

        repository:
            require(
                "./backup.repository"
            ),

        scheduler:
            require(
                "./backup.scheduler"
            ),

        backupService:
            require(
                "./backup.service"
            ),

        restoreService:
            require(
                "./restore.service"
            )
    });