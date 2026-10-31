"use strict";

/*
=================================================
TASK REPOSITORY
TEMP SAFE MEMORY STORE
COMMONJS ONLY
=================================================
*/

const tasks =
    new Map();

function generateId() {

    return String(
        Date.now()
    );
}

async function findAll() {

    return Array.from(
        tasks.values()
    );
}

async function findById(
    id
) {

    return (
        tasks.get(
            String(id)
        ) || null
    );
}

async function create(
    payload = {}
) {

    const id =
        generateId();

    const task = {

        id,

        title:
            String(
                payload.title || ""
            ),

        description:
            String(
                payload.description || ""
            ),

        status:
            String(
                payload.status || "pending"
            ),

        createdAt:
            new Date()
                .toISOString(),

        updatedAt:
            new Date()
                .toISOString()
    };

    tasks.set(
        id,
        task
    );

    return task;
}

async function update(
    id,
    payload = {}
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

    tasks.set(
        String(id),
        updated
    );

    return updated;
}

async function remove(
    id
) {

    const exists =
        await findById(id);

    if (!exists) {

        return false;
    }

    tasks.delete(
        String(id)
    );

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