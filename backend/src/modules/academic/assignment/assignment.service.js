"use strict";

const repository =
    require(
        "./assignment.repository"
    );

const validator =
    require(
        "./assignment.validator"
    );

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
            "assignment",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getAssignments() {

    try {

        const data =
            await repository.findAll();

        return success(
            data
        );

    } catch {

        return failure(
            "Failed to retrieve assignments"
        );
    }
}

async function getAssignmentById(
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

        const assignment =
            await repository.findById(
                id
            );

        if (
            !assignment
        ) {

            return failure(
                "Assignment not found"
            );
        }

        return success(
            assignment
        );

    } catch {

        return failure(
            "Failed to retrieve assignment"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getAssignments,

        getAssignmentById
    });