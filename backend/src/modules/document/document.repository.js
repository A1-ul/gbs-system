"use strict";

/*
==================================================
DOCUMENT REPOSITORY
ENTERPRISE HARDENED
COMMONJS ONLY
==================================================
*/

async function findAll() {

    return [];
}

async function findById(
    id
) {

    if (

        typeof id !== "string" ||

        !id.trim()

    ) {

        return null;
    }

    return null;
}

async function create(
    payload = {}
) {

    if (

        typeof payload !== "object" ||

        payload === null

    ) {

        throw new Error(
            "Invalid document payload"
        );
    }

    return Object.freeze({

        id:
            Date.now()
                .toString(),

        ...payload
    });
}

async function update(
    id,
    payload = {}
) {

    if (

        typeof id !== "string" ||

        !id.trim()

    ) {

        throw new Error(
            "Invalid document id"
        );
    }

    return Object.freeze({

        id,
        ...payload
    });
}

async function remove(
    id
) {

    if (

        typeof id !== "string" ||

        !id.trim()

    ) {

        throw new Error(
            "Invalid document id"
        );
    }

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