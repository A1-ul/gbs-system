"use strict";

/*
====================================
COMMONJS ONLY
====================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "CommonJS environment required"
    );
}

/*
====================================
IN-MEMORY SAFE FALLBACK
====================================
*/

const records = [];

/*
====================================
VALIDATION
====================================
*/

function validateId(
    id
) {

    const parsed =
        Number(id);

    if (

        !Number.isInteger(
            parsed
        ) ||

        parsed <= 0

    ) {

        throw new Error(
            "Invalid timetable id"
        );
    }

    return parsed;
}

/*
====================================
CRUD
====================================
*/

async function findAll() {

    return [...records];
}

async function findById(
    id
) {

    const record =
        records.find(

            item =>
                item.id ===
                validateId(id)

        );

    return record || null;
}

async function create(
    payload = {}
) {

    const record = {

        id:
            Date.now(),

        ...payload,

        createdAt:
            new Date()
                .toISOString(),

        updatedAt:
            new Date()
                .toISOString()
    };

    records.push(
        record
    );

    return record;
}

async function update(
    id,
    payload = {}
) {

    const record =
        await findById(
            id
        );

    if (!record) {

        throw new Error(
            "Timetable not found"
        );
    }

    Object.assign(

        record,

        payload,

        {

            updatedAt:
                new Date()
                    .toISOString()
        }
    );

    return record;
}

async function remove(
    id
) {

    const index =
        records.findIndex(

            item =>
                item.id ===
                validateId(id)

        );

    if (
        index < 0
    ) {

        throw new Error(
            "Timetable not found"
        );
    }

    records.splice(
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