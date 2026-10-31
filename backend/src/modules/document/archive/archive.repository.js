"use strict";

const {
    prisma
} = require(
    "../../../config/db"
);

function validatePrisma() {

    if (!prisma) {

        throw new Error(
            "Database unavailable"
        );
    }
}

function validateId(
    id
) {

    const archiveId =
        Number(id);

    if (
        !Number.isInteger(
            archiveId
        ) ||
        archiveId <= 0
    ) {

        throw new Error(
            "Invalid archive id"
        );
    }

    return archiveId;
}

async function findAll(
    options = {}
) {

    validatePrisma();

    if (
        !prisma.archive
    ) {

        return [];
    }

    const limit =
        Math.min(
            Number(options.limit) || 50,
            100
        );

    return prisma.archive.findMany({

        take: limit,

        orderBy: {
            createdAt:
                "desc"
        }
    });
}

async function findById(
    id
) {

    validatePrisma();

    if (
        !prisma.archive
    ) {

        return null;
    }

    return prisma.archive.findUnique({

        where: {
            id:
                validateId(id)
        }
    });
}

async function create(
    payload = {}
) {

    validatePrisma();

    if (
        !prisma.archive
    ) {

        throw new Error(
            "Archive model unavailable"
        );
    }

    return prisma.archive.create({

        data: payload
    });
}

async function remove(
    id
) {

    validatePrisma();

    if (
        !prisma.archive
    ) {

        throw new Error(
            "Archive model unavailable"
        );
    }

    return prisma.archive.delete({

        where: {
            id:
                validateId(id)
        }
    });
}

module.exports =
    Object.freeze({

        findAll,

        findById,

        create,

        remove
    });