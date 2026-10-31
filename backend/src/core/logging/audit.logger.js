"use strict";

const auditLogs = [];

function logAudit(
    action,
    actor,
    target = null
) {

    auditLogs.push({

        action,

        actor,

        target,

        timestamp:
            new Date()
                .toISOString()
    });

    return true;
}

function getAuditLogs() {

    return [...auditLogs];
}

module.exports =
    Object.freeze({

        logAudit,

        getAuditLogs
    });