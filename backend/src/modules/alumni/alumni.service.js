"use strict";

/*
====================================
ALUMNI SERVICE
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

const repository =
    require(
        "./alumni.repository"
    );

const validator =
    require(
        "./alumni.validator"
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
====================================
STATUS
====================================
*/

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "alumni",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
====================================
GET ALL
====================================
*/

async function getAlumni() {

    try {

        const result =
            await repository.findAll();

        return success(
            Array.isArray(result)
                ? result
                : []
        );

    } catch (error) {

        return failure(
            "Failed to retrieve alumni records"
        );
    }
}

/*
====================================
GET BY ID
====================================
*/

async function getAlumniById(
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
                "Alumni record not found"
            );
        }

        return success(
            record
        );

    } catch (error) {

        return failure(
            "Failed to retrieve alumni record"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getAlumni,

        getAlumniById
    });