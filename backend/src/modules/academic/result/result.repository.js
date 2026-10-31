"use strict";

const records =
    new Map();

async function findAll() {

    return Array.from(
        records.values()
    );
}

async function findById(
    id
) {

    if (!id) {

        return null;
    }

    return (
        records.get(
            String(id)
        ) || null
    );
}

async function create(
    payload = {}
) {

    const id =
        String(
            Date.now()
        );

    const record = {

        id,

        studentId:
            String(
                payload.studentId
            ),

        subject:
            String(
                payload.subject
            ),

        score:
            Number(
                payload.score || 0
            ),

        grade:
            payload.grade || "",

        createdAt:
            new Date()
                .toISOString(),

        updatedAt:
            new Date()
                .toISOString()
    };

    records.set(
        id,
        record
    );

    return record;
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

    records.set(
        String(id),
        updated
    );

    return updated;
}

async function remove(
    id
) {

    return records.delete(
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