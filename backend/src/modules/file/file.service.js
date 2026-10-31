"use strict";

const repository =
    require("./file.repository");

if (!repository) {
    throw new Error(
        "File repository unavailable"
    );
}

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
    message
) {

    return Object.freeze({
        success: false,
        message
    });
}

function validateId(id) {

    const fileId =
        Number(id);

    if (
        !Number.isInteger(fileId) ||
        fileId <= 0
    ) {
        throw new Error(
            "Invalid file id"
        );
    }

    return fileId;
}

async function getStatus() {

    return Object.freeze({
        success: true,
        module: "file",
        status: "active",
        timestamp:
            new Date().toISOString()
    });
}

async function getFiles() {

    const files =
        await repository.findAll();

    return success({
        count: files.length,
        records: files
    });
}

async function getFileById(id) {

    const file =
        await repository.findById(
            validateId(id)
        );

    if (!file) {

        return failure(
            "File not found"
        );
    }

    return success(file);
}

async function createFile(payload) {

    const file =
        await repository.create(
            payload
        );

    return success(
        file,
        "File created successfully"
    );
}

async function updateFile(
    id,
    payload
) {

    const file =
        await repository.update(
            validateId(id),
            payload
        );

    return success(
        file,
        "File updated successfully"
    );
}

async function deleteFile(id) {

    await repository.remove(
        validateId(id)
    );

    return success(
        {
            deleted: true
        },
        "File deleted successfully"
    );
}

module.exports =
    Object.freeze({
        getStatus,
        getFiles,
        getFileById,
        createFile,
        updateFile,
        deleteFile
    });