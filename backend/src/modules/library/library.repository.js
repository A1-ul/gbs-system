"use strict";

const crypto =
    require("crypto");

const books =
    new Map();

function validatePayload(
    payload = {}
) {

    if (
        typeof payload !== "object" ||
        payload === null
    ) {

        throw new Error(
            "Invalid book payload"
        );
    }

    return payload;
}

async function findAll() {

    return Array.from(
        books.values()
    );
}

async function findById(id) {

    return (
        books.get(
            String(id)
        ) || null
    );
}

async function create(
    payload = {}
) {

    validatePayload(
        payload
    );

    const id =
        crypto.randomUUID();

    const quantity =
        Number(
            payload.quantity || 0
        );

    const book = {

        id,

        title:
            payload.title || "",

        author:
            payload.author || "",

        isbn:
            payload.isbn || "",

        quantity,

        available:
            quantity,

        createdAt:
            new Date()
                .toISOString(),

        updatedAt:
            new Date()
                .toISOString()
    };

    books.set(
        id,
        book
    );

    return book;
}

async function update(
    id,
    payload = {}
) {

    const existing =
        await findById(id);

    if (!existing) {

        throw new Error(
            "Book not found"
        );
    }

    const updated = {

        ...existing,
        ...payload,

        updatedAt:
            new Date()
                .toISOString()
    };

    books.set(
        String(id),
        updated
    );

    return updated;
}

async function remove(id) {

    const exists =
        await findById(id);

    if (!exists) {

        throw new Error(
            "Book not found"
        );
    }

    books.delete(
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