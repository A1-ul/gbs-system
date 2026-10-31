"use strict";

const records = [];

function createAuditLog(
    action,
    actor,
    metadata = {}
) {

    records.push({

        action,

        actor,

        metadata,

        timestamp:
            new Date()
                .toISOString()
    });

    return true;
}

function getAuditLogs() {

    return [...records];
}

module.exports =
    Object.freeze({

        createAuditLog,

        getAuditLogs
    });