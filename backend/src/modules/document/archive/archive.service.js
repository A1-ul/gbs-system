"use strict";

const repository =
    require("./archive.repository");

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
            "archive",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getArchives() {

    try {

        const data =
            await repository.findAll();

        return Object.freeze({

            success: true,

            count:
                data.length,

            data
        });

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function getArchiveById(
    id
) {

    try {

        const archive =
            await repository.findById(
                id
            );

        if (!archive) {

            return failure(
                "Archive not found"
            );
        }

        return success(
            archive
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function createArchive(
    payload
) {

    try {

        const archive =
            await repository.create(
                payload
            );

        return success(
            archive
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function deleteArchive(
    id
) {

    try {

        await repository.remove(
            id
        );

        return Object.freeze({

            success: true,

            message:
                "Archive deleted"
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

        getArchives,

        getArchiveById,

        createArchive,

        deleteArchive
    });