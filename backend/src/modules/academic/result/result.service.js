"use strict";

const repository =
    require(
        "./result.repository"
    );

function success(
    data = null
) {

    return {

        success: true,
        data
    };
}

function failure(
    message
) {

    return {

        success: false,
        message
    };
}

async function getResults() {

    try {

        const data =
            await repository.findAll();

        return success(
            data
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function getResultById(
    id
) {

    try {

        const record =
            await repository.findById(
                id
            );

        if (!record) {

            return failure(
                "Result not found"
            );
        }

        return success(
            record
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function createResult(
    payload
) {

    try {

        const record =
            await repository.create(
                payload
            );

        return success(
            record
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function updateResult(
    id,
    payload
) {

    try {

        const record =
            await repository.update(
                id,
                payload
            );

        if (!record) {

            return failure(
                "Result not found"
            );
        }

        return success(
            record
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function deleteResult(
    id
) {

    try {

        const deleted =
            await repository.remove(
                id
            );

        if (!deleted) {

            return failure(
                "Result not found"
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

        getResults,
        getResultById,

        createResult,
        updateResult,
        deleteResult
    });