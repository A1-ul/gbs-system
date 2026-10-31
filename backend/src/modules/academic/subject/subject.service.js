"use strict";

/*
====================================
DEPENDENCIES
====================================
*/

const repository =
    require(
        "./subject.repository"
    );

/*
====================================
REPOSITORY VALIDATION
====================================
*/

const REQUIRED_METHODS = [

    "findAll",
    "findById",

    "create",
    "update",
    "remove"
];

for (
    const method
    of REQUIRED_METHODS
) {

    if (
        !repository ||
        typeof repository[
            method
        ] !== "function"
    ) {

        throw new Error(
            `Subject repository method missing: ${method}`
        );
    }
}

/*
====================================
HELPERS
====================================
*/

function success(
    data = null,
    message = "Success"
) {

    return Object.freeze({

        success: true,

        message,

        data
    });
}

function failure(
    message,
    code = "SUBJECT_ERROR"
) {

    return Object.freeze({

        success: false,

        code,

        message
    });
}

function validateId(
    id
) {

    const parsed =
        Number(id);

    return (
        Number.isInteger(
            parsed
        ) &&
        parsed > 0
    );
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
            "subject",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
====================================
GET SUBJECTS
====================================
*/

async function getSubjects() {

    try {

        const subjects =
            await repository.findAll();

        return success(

            Array.isArray(
                subjects
            )
                ? subjects
                : [],

            "Subjects retrieved"
        );

    } catch (error) {

        console.error(
            "[SUBJECT SERVICE] getSubjects:",
            error.message
        );

        return failure(
            "Failed to retrieve subjects"
        );
    }
}

/*
====================================
GET SUBJECT BY ID
====================================
*/

async function getSubjectById(
    id
) {

    try {

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid subject id",
                "INVALID_ID"
            );
        }

        const subject =
            await repository.findById(
                Number(id)
            );

        if (
            !subject
        ) {

            return failure(
                "Subject not found",
                "NOT_FOUND"
            );
        }

        return success(
            subject,
            "Subject retrieved"
        );

    } catch (error) {

        console.error(
            "[SUBJECT SERVICE] getSubjectById:",
            error.message
        );

        return failure(
            "Failed to retrieve subject"
        );
    }
}

/*
====================================
CREATE SUBJECT
====================================
*/

async function createSubject(
    payload = {}
) {

    try {

        if (
            !payload ||
            typeof payload !==
                "object"
        ) {

            return failure(
                "Invalid subject payload",
                "INVALID_PAYLOAD"
            );
        }

        const subject =
            await repository.create(
                payload
            );

        return success(
            subject,
            "Subject created successfully"
        );

    } catch (error) {

        console.error(
            "[SUBJECT SERVICE] createSubject:",
            error.message
        );

        return failure(
            "Failed to create subject"
        );
    }
}

/*
====================================
UPDATE SUBJECT
====================================
*/

async function updateSubject(
    id,
    payload = {}
) {

    try {

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid subject id",
                "INVALID_ID"
            );
        }

        const existing =
            await repository.findById(
                Number(id)
            );

        if (
            !existing
        ) {

            return failure(
                "Subject not found",
                "NOT_FOUND"
            );
        }

        const subject =
            await repository.update(
                Number(id),
                payload
            );

        return success(
            subject,
            "Subject updated successfully"
        );

    } catch (error) {

        console.error(
            "[SUBJECT SERVICE] updateSubject:",
            error.message
        );

        return failure(
            "Failed to update subject"
        );
    }
}

/*
====================================
DELETE SUBJECT
====================================
*/

async function deleteSubject(
    id
) {

    try {

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid subject id",
                "INVALID_ID"
            );
        }

        const existing =
            await repository.findById(
                Number(id)
            );

        if (
            !existing
        ) {

            return failure(
                "Subject not found",
                "NOT_FOUND"
            );
        }

        await repository.remove(
            Number(id)
        );

        return success(

            {
                deleted: true,
                id: Number(id)
            },

            "Subject deleted successfully"
        );

    } catch (error) {

        console.error(
            "[SUBJECT SERVICE] deleteSubject:",
            error.message
        );

        return failure(
            "Failed to delete subject"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getSubjects,
        getSubjectById,

        createSubject,
        updateSubject,
        deleteSubject
    });