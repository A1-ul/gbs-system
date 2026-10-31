"use strict";

module.exports =
    Object.freeze({

        constants:
            require(
                "./queue.constants"
            ),

        jobs:
            require(
                "./queue.jobs"
            ),

        registry:
            require(
                "./queue.registry"
            ),

        email:
            require(
                "./email.queue"
            ),

        sms:
            require(
                "./sms.queue"
            ),

        notification:
            require(
                "./notification.queue"
            ),

        report:
            require(
                "./report.queue"
            ),

        backup:
            require(
                "./backup.queue"
            ),

        meeting:
            require(
                "./meeting.queue"
            )
    });