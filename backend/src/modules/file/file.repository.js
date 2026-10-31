"use strict";

function validateId(id) {

    const fileId = Number(id);

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

async function findAll() {

    return [];
}

async function findById(id) {

    validateId(id);

    return null;
}

async function create(payload = {}) {

    if (
        typeof payload !== "object" ||
        payload === null
    ) {
        throw new Error(
            "Invalid file payload"
        );
    }

    return payload;
}

async function update(
    id,
    payload = {}
) {

    validateId(id);

    if (
        typeof payload !== "object" ||
        payload === null
    ) {
        throw new Error(
            "Invalid file payload"
        );
    }

    return {
        id: validateId(id),
        ...payload
    };
}

async function remove(id) {

    validateId(id);

    return true;
}

module.exports =
    Object.freeze({
        findAll,
        findById,
        create,
        update,
        remove
    });