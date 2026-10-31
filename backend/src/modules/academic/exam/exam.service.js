"use strict";

const repository =
    require(
        "./exam.repository"
    );

const validator =
    require(
        "./exam.validator"
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
    message,
    statusCode = 400
) {

    return Object.freeze({

        success: false,
        message,
        statusCode
    });
}

async function getStatus() {

    return success({

        module:
            "exam",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getExams() {

    try {

        const exams =
            await repository.findAll();

        return success(
            exams
        );

    } catch (
        error
    ) {

        return failure(
            error.message,
            500
        );
    }
}

async function getExamById(
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

        const exam =
            await repository.findById(
                id
            );

        if (!exam) {

            return failure(
                "Exam not found",
                404
            );
        }

        return success(
            exam
        );

    } catch (
        error
    ) {

        return failure(
            error.message,
            500
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,
        getExams,
        getExamById
    });