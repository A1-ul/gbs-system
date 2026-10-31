"use strict";

/*
==================================================
GBS ENTERPRISE VERIFICATION REPOSITORY
COMMONJS ONLY
PRISMA + POSTGRESQL
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
DEPENDENCY VALIDATION
==================================================
*/

function validatePrisma() {

    if (
        !prisma ||
        !prisma.verification
    ) {

        throw new Error(
            "Prisma verification model unavailable"
        );
    }
}

/*
==================================================
HELPERS
==================================================
*/

function validateId(
    id
) {

    const verificationId =
        Number(id);

    if (
        !Number.isInteger(
            verificationId
        ) ||
        verificationId <= 0
    ) {

        throw new Error(
            "Invalid verification id"
        );
    }

    return verificationId;
}

function sanitizePayload(
    payload = {}
) {

    const clean = {
        ...payload
    };

    delete clean.id;
    delete clean.createdAt;
    delete clean.updatedAt;

    return clean;
}

/*
==================================================
FIND ALL
==================================================
*/

async function findAll() {

    validatePrisma();

    return prisma.verification.findMany({

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

    validatePrisma();

    return prisma.verification.findUnique({

        where: {
            id: validateId(id)
        }
    });
}

/*
==================================================
CREATE
==================================================
*/

async function create(
    payload = {}
) {

    validatePrisma();

    return prisma.verification.create({

        data:
            sanitizePayload(
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
    payload = {}
) {

    validatePrisma();

    return prisma.verification.update({

        where: {
            id: validateId(id)
        },

        data:
            sanitizePayload(
                payload
            )
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

    validatePrisma();

    return prisma.verification.delete({

        where: {
            id: validateId(id)
        }
    });
}

/*
==================================================
EXISTS
==================================================
*/

async function exists(
    id
) {

    validatePrisma();

    const record =
        await prisma.verification.findUnique({

            where: {
                id: validateId(id)
            },

            select: {
                id: true
            }
        });

    return Boolean(
        record
    );
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

        remove,
        exists
    });