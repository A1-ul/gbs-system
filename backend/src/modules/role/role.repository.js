"use strict";

const {
    prisma
} = require(
    "../../config/db"
);

function validatePrisma() {

    if (
        !prisma ||
        !prisma.role
    ) {

        throw new Error(
            "Role model unavailable"
        );
    }
}

async function findAll() {

    try {

        validatePrisma();

        return await prisma.role.findMany({

            orderBy: {
                id: "asc"
            }
        });

    } catch (error) {

        console.error(
            "[ROLE REPOSITORY FINDALL ERROR]",
            error.message
        );

        return [];
    }
}

async function findById(
    id
) {

    try {

        validatePrisma();

        const roleId =
            Number(id);

        if (
            !Number.isInteger(
                roleId
            ) ||
            roleId <= 0
        ) {

            return null;
        }

        return await prisma.role.findUnique({

            where: {
                id: roleId
            }
        });

    } catch (error) {

        console.error(
            "[ROLE REPOSITORY FINDBYID ERROR]",
            error.message
        );

        return null;
    }
}

module.exports =
    Object.freeze({

        findAll,
        findById
    });