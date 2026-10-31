"use strict";

/*
==================================================
GBS ENTERPRISE APPLICATION SERVICE
COMMONJS ONLY
==================================================
*/

const repository =
    require("./application.repository");

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

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "application",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getApplications() {

    try {

        const data =
            await repository.findAll();

        return success(data);

    } catch (error) {

        return failure(
            error.message ||
            "Failed to retrieve applications"
        );
    }
}

async function getApplicationById(
    id
) {

    try {

        const record =
            await repository.findById(id);

        if (!record) {

            return failure(
                "Application not found"
            );
        }

        return success(record);

    } catch (error) {

        return failure(
            error.message ||
            "Failed to retrieve application"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getApplications,

        getApplicationById
    });