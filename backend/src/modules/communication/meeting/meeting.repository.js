"use strict";

const meetings =
    new Map();

async function findAll() {

    return Array.from(
        meetings.values()
    );
}

async function findById(
    id
) {

    return (
        meetings.get(
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

        title:
            String(
                payload.title || ""
            ),

        description:
            String(
                payload.description || ""
            ),

        meetingDate:
            payload.meetingDate || null,

        createdAt:
            new Date()
                .toISOString(),

        updatedAt:
            new Date()
                .toISOString()
    };

    meetings.set(
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

        throw new Error(
            "Meeting not found"
        );
    }

    const updated = {

        ...existing,

        ...payload,

        updatedAt:
            new Date()
                .toISOString()
    };

    meetings.set(
        String(id),
        updated
    );

    return updated;
}

async function remove(
    id
) {

    return meetings.delete(
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