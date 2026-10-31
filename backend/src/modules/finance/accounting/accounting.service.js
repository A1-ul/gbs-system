"use strict";

/*
=========================================
ACCOUNTANT SERVICE
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const repository =
    require("./accounting.repository");

const validator =
    require("./accounting.validator");

const logger =
    require("../../../utils/logger");

function success(
    data = null
) {

    return Object.freeze({

        success: true,

        data
    });
}

function failure(
    message
) {

    return Object.freeze({

        success: false,

        message
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
            "accountant",

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

async function getAccountants() {

    try {

        const data =
            await repository.findAll();

        return success(
            data
        );

    } catch (error) {

        logger.error(
            "ACCOUNTANT_SERVICE_FINDALL_FAILURE",
            {
                message:
                    error.message
            }
        );

        throw error;
    }
}

/*
=========================================
GET BY ID
=========================================
*/

async function getAccountantById(
    id
) {

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

    try {

        const accountant =
            await repository.findById(
                Number(id)
            );

        if (
            !accountant
        ) {

            return failure(
                "Accountant not found"
            );
        }

        return success(
            accountant
        );

    } catch (error) {

        logger.error(
            "ACCOUNTANT_SERVICE_FINDBYID_FAILURE",
            {
                id,
                message:
                    error.message
            }
        );

        throw error;
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getAccountants,

        getAccountantById
    });