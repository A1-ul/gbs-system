"use strict";

const repository =
    require("./classroom.repository");

const validator =
    require("./classroom.validator");

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
            "classroom",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getClassrooms() {

    try {

        const classrooms =
            await repository.findAll();

        return success(
            classrooms
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function getClassroomById(
    id
) {

    try {

        const classroom =
            await repository.findById(
                id
            );

        if (!classroom) {

            return failure(
                "Classroom not found"
            );
        }

        return success(
            classroom
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function createClassroom(
    payload
) {

    try {

        const validation =
            validator.validateCreate(
                payload
            );

        if (
            !validation.valid
        ) {

            return failure(
                validation.errors.join(", ")
            );
        }

        const classroom =
            await repository.create(
                payload
            );

        return success(
            classroom
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function updateClassroom(
    id,
    payload
) {

    try {

        const validation =
            validator.validateUpdate(
                payload
            );

        if (
            !validation.valid
        ) {

            return failure(
                validation.errors.join(", ")
            );
        }

        const classroom =
            await repository.update(
                id,
                payload
            );

        if (!classroom) {

            return failure(
                "Classroom not found"
            );
        }

        return success(
            classroom
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function deleteClassroom(
    id
) {

    try {

        const deleted =
            await repository.remove(
                id
            );

        if (!deleted) {

            return failure(
                "Classroom not found"
            );
        }

        return success({
            deleted: true
        });

    } catch (error) {

        return failure(
            error.message
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,
        getClassrooms,
        getClassroomById,
        createClassroom,
        updateClassroom,
        deleteClassroom
    });