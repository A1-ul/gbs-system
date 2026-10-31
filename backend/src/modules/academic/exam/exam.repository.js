"use strict";

const crypto =
    require("crypto");

const examStore =
    new Map();

async function findAll() {

    return Array.from(
        examStore.values()
    );
}

async function findById(
    id
) {

    return (
        examStore.get(
            String(id)
        ) || null
    );
}

async function create(
    payload
) {

    const id =
        crypto.randomUUID();

    const record = {

        id,

        ...payload,

        createdAt:
            new Date()
                .toISOString(),

        updatedAt:
            null
    };

    examStore.set(
        id,
        record
    );

    return record;
}

async function update(
    id,
    payload
) {

    const existing =
        await findById(id);

    if (!existing) {

        return null;
    }

    const updated = {

        ...existing,

        ...payload,

        updatedAt:
            new Date()
                .toISOString()
    };

    examStore.set(
        String(id),
        updated
    );

    return updated;
}

async function remove(
    id
) {

    return examStore.delete(
        String(id)
    );
}

module.exports =
    Object.freeze({

        findAll,
        findById,
        create,
        update,
        remove
    });