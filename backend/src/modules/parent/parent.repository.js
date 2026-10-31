"use strict";

/*
====================================
TEMP SAFE REPOSITORY
====================================
Replace with Prisma later
====================================
*/

const parentStore =
    new Map();

async function findAll() {

    return Array.from(
        parentStore.values()
    );
}

async function findById(
    id
) {

    if (!id) {

        return null;
    }

    return (
        parentStore.get(
            String(id)
        ) || null
    );
}

module.exports =
    Object.freeze({

        findAll,
        findById
    });