"use strict";

/*
=========================================
GBS ENTERPRISE AUDITLOG SERVICE
COMMONJS ONLY
CRASH RESISTANT
=========================================
*/

const repository =
    require(
        "./audit-history.repository"
    );

const validator =
    require(
        "./audit-history.validator"
    );

function success(
    data = null
) {

    return Object.freeze({

        success: true,

        data,

        timestamp:
            new Date()
                .toISOString()
    });
}

function failure(
    message
) {

    return Object.freeze({

        success: false,

        message,

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "auditlog",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getAuditLogs() {

    try {

        const data =
            await repository.findAll();

        return success(
            data
        );

    } catch (error) {

        console.error(
            "[AUDITLOG_SERVICE_GET_ALL_ERROR]",
            error.message
        );

        return failure(
            "Failed to retrieve audit logs"
        );
    }
}

async function getAuditLogById(
    id
) {

    try {

        const validation =
            validator.validateId(
                id
            );

        if (
            !validation.success
        ) {

            return failure(
                validation.message
            );
        }

        const record =
            await repository.findById(
                id
            );

        if (!record) {

            return failure(
                "Audit log not found"
            );
        }

        return success(
            record
        );

    } catch (error) {

        console.error(
            "[AUDITLOG_SERVICE_GET_BY_ID_ERROR]",
            error.message
        );

        return failure(
            "Failed to retrieve audit log"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getAuditLogs,

        getAuditLogById
    });