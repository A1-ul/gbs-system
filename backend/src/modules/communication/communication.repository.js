"use strict";

/*
==================================================
COMMUNICATION REPOSITORY
ENTERPRISE HARDENED
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

const {
    prisma
} = require(
    "../../config/db"
);

/*
==================================================
PRISMA VALIDATION
==================================================
*/

function getModel() {

    if (!prisma) {

        throw new Error(
            "Prisma client unavailable"
        );
    }

    if (!prisma.communication) {

        throw new Error(
            "Prisma communication model unavailable"
        );
    }

    return prisma.communication;
}

/*
==================================================
ID VALIDATION
==================================================
*/

function validateId(
    id
) {

    const communicationId =
        Number(id);

    if (
        !Number.isInteger(
            communicationId
        ) ||
        communicationId <= 0
    ) {

        throw new Error(
            "Invalid communication id"
        );
    }

    return communicationId;
}

/*
==================================================
PAYLOAD VALIDATION
==================================================
*/

function validatePayload(
    payload = {}
) {

    if (
        !payload ||
        typeof payload !== "object"
    ) {

        throw new Error(
            "Invalid communication payload"
        );
    }

    return payload;
}

/*
==================================================
FIND ALL
==================================================
*/

async function findAll() {

    return getModel()
        .findMany({

            orderBy: {
                id: "desc"
            }
        });
}

/*
==================================================
FIND BY ID
==================================================
*/

async function findById(
    id
) {

    return getModel()
        .findUnique({

            where: {
                id:
                    validateId(id)
            }
        });
}

/*
==================================================
CREATE
==================================================
*/

async function create(
    payload
) {

    return getModel()
        .create({

            data:
                validatePayload(
                    payload
                )
        });
}

/*
==================================================
UPDATE
==================================================
*/

async function update(
    id,
    payload
) {

    const cleanPayload =
        validatePayload(
            payload
        );

    if (
        Object.keys(
            cleanPayload
        ).length === 0
    ) {

        throw new Error(
            "Update payload cannot be empty"
        );
    }

    return getModel()
        .update({

            where: {
                id:
                    validateId(id)
            },

            data:
                cleanPayload
        });
}

/*
==================================================
DELETE
==================================================
*/

async function remove(
    id
) {

    return getModel()
        .delete({

            where: {
                id:
                    validateId(id)
            }
        });
}

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        findAll,
        findById,
        create,
        update,
        remove
    });