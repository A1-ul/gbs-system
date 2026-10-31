"use strict";

const {
    prisma
} = require(
    "../../config/db"
);

function validatePrisma() {

    if (
        !prisma ||
        !prisma.permission
    ) {

        throw new Error(
            "Prisma permission model unavailable"
        );
    }
}

async function findAll() {

    validatePrisma();

    return prisma.permission.findMany({

        orderBy: {
            id: "desc"
        }
    });
}

async function findById(
    id
) {

    validatePrisma();

    const permissionId =
        Number(id);

    if (
        !Number.isInteger(permissionId) ||
        permissionId <= 0
    ) {

        throw new Error(
            "Invalid permission id"
        );
    }

    return prisma.permission.findUnique({

        where: {
            id: permissionId
        }
    });
}

module.exports =
    Object.freeze({

        findAll,
        findById
    });