"use strict";

const repository =
    require(
        "./grade.repository"
    );

const validator =
    require(
        "./grade.validator"
    );

if (

    !repository ||

    typeof repository.findAll !==
        "function"

) {

    throw new Error(
        "Grade repository unavailable"
    );
}

function success(
    data = null,
    message = null
) {

    return Object.freeze({

        success: true,

        message,

        data
    });
}

function failure(
    message
) {

    return Object.freeze({

        success: false,

        message,

        data: null
    });
}

async function getGrades() {

    const records =
        await repository.findAll();

    return success({

        count:
            records.length,

        records
    });
}

async function getGradeById(
    id
) {

    const record =
        await repository.findById(
            id
        );

    if (!record) {

        return failure(
            "Grade not found"
        );
    }

    return success(record);
}

async function createGrade(
    payload
) {

    const validation =
        validator.validateCreate(
            payload
        );

    if (
        !validation.valid
    ) {

        return failure(
            validation.errors.join(
                ", "
            )
        );
    }

    const record =
        await repository.create(
            payload
        );

    return success(
        record,
        "Grade created"
    );
}

async function updateGrade(
    id,
    payload
) {

    const validation =
        validator.validateUpdate(
            payload
        );

    if (
        !validation.valid
    ) {

        return failure(
            validation.errors.join(
                ", "
            )
        );
    }

    const record =
        await repository.update(
            id,
            payload
        );

    return success(
        record,
        "Grade updated"
    );
}

async function deleteGrade(
    id
) {

    await repository.remove(id);

    return success(

        {
            deleted: true
        },

        "Grade deleted"
    );
}

module.exports =
    Object.freeze({

        getGrades,
        getGradeById,

        createGrade,
        updateGrade,
        deleteGrade
    });