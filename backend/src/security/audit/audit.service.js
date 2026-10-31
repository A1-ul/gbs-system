"use strict";

/*
=========================================
GBS ENTERPRISE AUDIT SERVICE
COMMONJS ONLY
CRASH RESISTANT
=========================================
*/

const repository =
    require(
        "./audit.repository"
    );

const validator =
    require(
        "./audit.validator"
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

/*
=========================================
STATUS
=========================================
*/

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "audit",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
=========================================
GET ALL
=========================================
*/

async function getAudits() {

    try {

        const data =
            await repository.findAll();

        return success(data);

    } catch (error) {

        console.error(
            "[AUDIT_SERVICE_GET_ALL_ERROR]",
            error.message
        );

        return failure(
            "Failed to retrieve audits"
        );
    }
}

/*
=========================================
GET BY ID
=========================================
*/

async function getAuditById(
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

        const audit =
            await repository.findById(
                id
            );

        if (!audit) {

            return failure(
                "Audit record not found"
            );
        }

        return success(
            audit
        );

    } catch (error) {

        console.error(
            "[AUDIT_SERVICE_GET_BY_ID_ERROR]",
            error.message
        );

        return failure(
            "Failed to retrieve audit record"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getAudits,

        getAuditById
    });