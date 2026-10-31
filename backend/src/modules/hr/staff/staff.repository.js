"use strict";

/*
====================================
STAFF REPOSITORY
CRASH SAFE
COMMONJS ONLY
====================================
*/

const staffStore =
    new Map();

async function findAll() {

    try {

        return Array.from(
            staffStore.values()
        );

    } catch {

        return [];
    }
}

async function findById(
    id
) {

    try {

        if (!id) {

            return null;
        }

        return (
            staffStore.get(
                String(id)
            ) || null
        );

    } catch {

        return null;
    }
}

module.exports =
    Object.freeze({

        findAll,
        findById
    });