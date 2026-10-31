"use strict";

const dataStore = [];

function validateId(id) {

    if (
        typeof id !== "string" ||
        !id.trim()
    ) {
        throw new Error(
            "Invalid receipt id"
        );
    }

    return id.trim();
}

async function findAll() {

    return [...dataStore];
}

async function findById(id) {

    const receiptId =
        validateId(id);

    return (
        dataStore.find(
            item =>
                item.id === receiptId
        ) || null
    );
}

async function create(
    payload = {}
) {

    const record = {

        id:
            `receipt_${Date.now()}`,

        studentId:
            payload.studentId,

        amount:
            Number(payload.amount),

        description:
            payload.description || "",

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()
    };

    dataStore.push(record);

    return record;
}

async function update(
    id,
    payload = {}
) {

    const receiptId =
        validateId(id);

    const index =
        dataStore.findIndex(
            item =>
                item.id === receiptId
        );

    if (
        index === -1
    ) {
        return null;
    }

    dataStore[index] = {

        ...dataStore[index],

        ...payload,

        updatedAt:
            new Date().toISOString()
    };

    return dataStore[index];
}

async function remove(id) {

    const receiptId =
        validateId(id);

    const index =
        dataStore.findIndex(
            item =>
                item.id === receiptId
        );

    if (
        index === -1
    ) {
        return false;
    }

    dataStore.splice(
        index,
        1
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