"use strict";

const reports =
    new Map();

async function findAll() {

    return Array.from(
        reports.values()
    );
}

async function findById(
    id
) {

    if (!id) {

        return null;
    }

    return (
        reports.get(
            String(id)
        ) || null
    );
}

async function create(
    payload = {}
) {

    const id =
        payload.id ||
        `report_${Date.now()}`;

    const report = {

        id,

        title:
            String(
                payload.title || ""
            ),

        type:
            String(
                payload.type || ""
            ),

        createdAt:
            new Date()
                .toISOString(),

        updatedAt:
            new Date()
                .toISOString()
    };

    reports.set(
        id,
        report
    );

    return report;
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

    reports.set(
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

    reports.delete(
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