"use strict";

const repository =
    require(
        "./graduation.repository"
    );

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

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "graduate",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getGraduates() {

    try {

        const graduates =
            await repository.findAll();

        return success({

            count:
                graduates.length,

            records:
                graduates
        });

    } catch {

        return failure(
            "Failed to retrieve graduates"
        );
    }
}

async function getGraduateById(
    id
) {

    try {

        const graduate =
            await repository.findById(
                id
            );

        if (!graduate) {

            return failure(
                "Graduate not found"
            );
        }

        return success(
            graduate
        );

    } catch {

        return failure(
            "Failed to retrieve graduate"
        );
    }
}

async function createGraduate(
    payload
) {

    try {

        const graduate =
            await repository.create(
                payload
            );

        return success(
            graduate,
            "Graduate created"
        );

    } catch {

        return failure(
            "Failed to create graduate"
        );
    }
}

async function updateGraduate(
    id,
    payload
) {

    try {

        const graduate =
            await repository.update(
                id,
                payload
            );

        return success(
            graduate,
            "Graduate updated"
        );

    } catch {

        return failure(
            "Failed to update graduate"
        );
    }
}

async function deleteGraduate(
    id
) {

    try {

        await repository.remove(
            id
        );

        return success(
            {
                deleted: true
            },
            "Graduate deleted"
        );

    } catch {

        return failure(
            "Failed to delete graduate"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getGraduates,
        getGraduateById,

        createGraduate,
        updateGraduate,
        deleteGraduate
    });