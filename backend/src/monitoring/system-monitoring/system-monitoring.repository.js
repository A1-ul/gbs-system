"use strict";

function sanitizeId(id) {

    const value = Number(id);

    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {

        throw new Error(
            "Invalid monitoring id"
        );
    }

    return value;
}

async function findAll() {

    return [];
}

async function findById(id) {

    sanitizeId(id);

    return null;
}

async function create(payload = {}) {

    return Object.freeze({
        ...payload
    });
}

async function update(
    id,
    payload = {}
) {

    sanitizeId(id);

    return Object.freeze({

        id: Number(id),

        ...payload
    });
}

async function remove(id) {

    sanitizeId(id);

    return true;
}

module.exports = Object.freeze({

    findAll,
    findById,
    create,
    update,
    remove
});