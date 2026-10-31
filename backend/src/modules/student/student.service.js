"use strict";

/*
=========================================
COMMONJS ONLY PROTECTION
=========================================
*/

if (typeof module === "undefined") {
    throw new Error(
        "CommonJS environment required"
    );
}

/*
=========================================
DEPENDENCIES
=========================================
*/

const repository =
    require(
        "./student.repository"
    );

/*
=========================================
REPOSITORY VALIDATION
=========================================
*/

const REQUIRED_METHODS = [

    "findAll",
    "findById",
    "create",
    "update",
    "remove"
];

for (const method of REQUIRED_METHODS) {

    if (
        !repository ||
        typeof repository[method] !==
            "function"
    ) {

        throw new Error(
            `Student repository method missing: ${method}`
        );
    }
}

/*
=========================================
HELPERS
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
    code = "STUDENT_ERROR"
) {

    return Object.freeze({

        success: false,
        code,
        message
    });
}

function sanitizeStudent(
    student
) {

    if (
        !student ||
        typeof student !==
            "object"
    ) {

        return null;
    }

    const sanitized = {
        ...student
    };

    delete sanitized.password;
    delete sanitized.refreshToken;

    return sanitized;
}

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
STATUS
=========================================
*/

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "student",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
=========================================
GET STUDENTS
=========================================
*/

async function getStudents() {

    try {

        const students =
            await repository.findAll();

        return success(

            Array.isArray(
                students
            )
                ? students.map(
                      sanitizeStudent
                  )
                : [],

            "Students retrieved"
        );

    } catch (error) {

        console.error(
            "[STUDENT SERVICE] getStudents:",
            error.message
        );

        return failure(
            "Failed to retrieve students"
        );
    }
}

/*
=========================================
GET STUDENT BY ID
=========================================
*/

async function getStudentById(
    id
) {

    try {

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid student ID",
                "INVALID_ID"
            );
        }

        const student =
            await repository.findById(
                Number(id)
            );

        if (
            !student
        ) {

            return failure(
                "Student not found",
                "NOT_FOUND"
            );
        }

        return success(

            sanitizeStudent(
                student
            ),

            "Student retrieved"
        );

    } catch (error) {

        console.error(
            "[STUDENT SERVICE] getStudentById:",
            error.message
        );

        return failure(
            "Failed to retrieve student"
        );
    }
}

/*
=========================================
CREATE STUDENT
=========================================
*/

async function createStudent(
    payload = {}
) {

    try {

        if (
            !payload ||
            typeof payload !==
                "object"
        ) {

            return failure(
                "Invalid student payload",
                "INVALID_PAYLOAD"
            );
        }

        const student =
            await repository.create(
                payload
            );

        return success(

            sanitizeStudent(
                student
            ),

            "Student created successfully"
        );

    } catch (error) {

        console.error(
            "[STUDENT SERVICE] createStudent:",
            error.message
        );

        return failure(
            "Failed to create student"
        );
    }
}

/*
=========================================
UPDATE STUDENT
=========================================
*/

async function updateStudent(
    id,
    payload = {}
) {

    try {

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid student ID",
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
                "Student not found",
                "NOT_FOUND"
            );
        }

        const student =
            await repository.update(
                Number(id),
                payload
            );

        return success(

            sanitizeStudent(
                student
            ),

            "Student updated successfully"
        );

    } catch (error) {

        console.error(
            "[STUDENT SERVICE] updateStudent:",
            error.message
        );

        return failure(
            "Failed to update student"
        );
    }
}

/*
=========================================
DELETE STUDENT
=========================================
*/

async function deleteStudent(
    id
) {

    try {

        if (
            !validateId(id)
        ) {

            return failure(
                "Invalid student ID",
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
                "Student not found",
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

            "Student deleted successfully"
        );

    } catch (error) {

        console.error(
            "[STUDENT SERVICE] deleteStudent:",
            error.message
        );

        return failure(
            "Failed to delete student"
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

        getStudents,
        getStudentById,

        createStudent,
        updateStudent,
        deleteStudent
    });