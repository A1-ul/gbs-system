"use strict";

/*
=========================================
TEACHER SERVICE
ENTERPRISE HARDENED
COMMONJS ONLY
=========================================
*/

const repository =
    require(
        "./teacher.repository"
    );

/*
=========================================
REPOSITORY VALIDATION
=========================================
*/

function repositoryAvailable() {

    return Boolean(

        repository &&

        typeof repository.findAll ===
            "function" &&

        typeof repository.findById ===
            "function" &&

        typeof repository.create ===
            "function" &&

        typeof repository.update ===
            "function" &&

        typeof repository.remove ===
            "function"
    );
}

/*
=========================================
RESPONSE HELPERS
=========================================
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
    code = "TEACHER_ERROR"
) {

    return Object.freeze({

        success: false,

        code,

        message
    });
}

/*
=========================================
ID VALIDATION
=========================================
*/

function validateId(
    id
) {

    const parsedId =
        Number(id);

    return (

        Number.isInteger(
            parsedId
        ) &&

        parsedId > 0
    );
}

/*
=========================================
PAYLOAD SANITIZATION
=========================================
*/

function sanitizePayload(
    payload = {}
) {

    if (
        !payload ||
        typeof payload !==
            "object"
    ) {

        return {};
    }

    return {

        firstName:
            payload.firstName,

        lastName:
            payload.lastName,

        email:
            payload.email,

        tenantId:
            payload.tenantId
    };
}

/*
=========================================
TEACHER SANITIZATION
=========================================
*/

function sanitizeTeacher(
    teacher
) {

    if (
        !teacher ||
        typeof teacher !==
            "object"
    ) {

        return null;
    }

    const safeTeacher = {

        ...teacher
    };

    delete safeTeacher.password;

    delete safeTeacher.refreshToken;

    delete safeTeacher.resetToken;

    delete safeTeacher.resetTokenExpiry;

    return safeTeacher;
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
            "teacher",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
=========================================
GET ALL TEACHERS
=========================================
*/

async function getTeachers() {

    try {

        if (
            !repositoryAvailable()
        ) {

            return failure(
                "Teacher repository unavailable",
                "REPOSITORY_ERROR"
            );
        }

        const teachers =
            await repository.findAll();

        const safeTeachers =

            Array.isArray(
                teachers
            )

                ? teachers.map(
                      sanitizeTeacher
                  )

                : [];

        return Object.freeze({

            success: true,

            count:
                safeTeachers.length,

            data:
                safeTeachers
        });

    } catch (error) {

        console.error(

            "[TEACHER SERVICE]",

            "getTeachers:",

            error.message
        );

        return failure(
            "Failed to retrieve teachers"
        );
    }
}

/*
=========================================
GET TEACHER BY ID
=========================================
*/

async function getTeacherById(
    id
) {

    try {

        if (
            !repositoryAvailable()
        ) {

            return failure(
                "Teacher repository unavailable",
                "REPOSITORY_ERROR"
            );
        }

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid teacher ID",
                "INVALID_ID"
            );
        }

        const teacher =
            await repository.findById(
                Number(id)
            );

        if (
            !teacher
        ) {

            return failure(
                "Teacher not found",
                "NOT_FOUND"
            );
        }

        return success(

            sanitizeTeacher(
                teacher
            ),

            "Teacher retrieved successfully"
        );

    } catch (error) {

        console.error(

            "[TEACHER SERVICE]",

            "getTeacherById:",

            error.message
        );

        return failure(
            "Failed to retrieve teacher"
        );
    }
}

/*
=========================================
CREATE TEACHER
=========================================
*/

async function createTeacher(
    payload = {}
) {

    try {

        if (
            !repositoryAvailable()
        ) {

            return failure(
                "Teacher repository unavailable",
                "REPOSITORY_ERROR"
            );
        }

        const teacher =
            await repository.create(

                sanitizePayload(
                    payload
                )
            );

        if (
            !teacher
        ) {

            return failure(
                "Failed to create teacher"
            );
        }

        return success(

            sanitizeTeacher(
                teacher
            ),

            "Teacher created successfully"
        );

    } catch (error) {

        console.error(

            "[TEACHER SERVICE]",

            "createTeacher:",

            error.message
        );

        return failure(
            "Failed to create teacher"
        );
    }
}

/*
=========================================
UPDATE TEACHER
=========================================
*/

async function updateTeacher(
    id,
    payload = {}
) {

    try {

        if (
            !repositoryAvailable()
        ) {

            return failure(
                "Teacher repository unavailable",
                "REPOSITORY_ERROR"
            );
        }

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid teacher ID",
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
                "Teacher not found",
                "NOT_FOUND"
            );
        }

        const teacher =
            await repository.update(

                Number(id),

                sanitizePayload(
                    payload
                )
            );

        if (
            !teacher
        ) {

            return failure(
                "Failed to update teacher"
            );
        }

        return success(

            sanitizeTeacher(
                teacher
            ),

            "Teacher updated successfully"
        );

    } catch (error) {

        console.error(

            "[TEACHER SERVICE]",

            "updateTeacher:",

            error.message
        );

        return failure(
            "Failed to update teacher"
        );
    }
}

/*
=========================================
DELETE TEACHER
=========================================
*/

async function deleteTeacher(
    id
) {

    try {

        if (
            !repositoryAvailable()
        ) {

            return failure(
                "Teacher repository unavailable",
                "REPOSITORY_ERROR"
            );
        }

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid teacher ID",
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
                "Teacher not found",
                "NOT_FOUND"
            );
        }

        const deleted =
            await repository.remove(
                Number(id)
            );

        if (
            !deleted
        ) {

            return failure(
                "Failed to delete teacher"
            );
        }

        return success(

            {
                deleted: true,
                id: Number(id)
            },

            "Teacher deleted successfully"
        );

    } catch (error) {

        console.error(

            "[TEACHER SERVICE]",

            "deleteTeacher:",

            error.message
        );

        return failure(
            "Failed to delete teacher"
        );
    }
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        getStatus,

        getTeachers,

        getTeacherById,

        createTeacher,

        updateTeacher,

        deleteTeacher
    });