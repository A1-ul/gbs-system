"use strict";

const {
    prisma
} = require(
    "../../config/db"
);

/*
====================================
DEPENDENCY VALIDATION
====================================
*/

if (!prisma) {

    throw new Error(
        "Prisma client unavailable"
    );
}

function getModel() {

    if (
        !prisma.subject
    ) {

        throw new Error(
            "Prisma subject model unavailable"
        );
    }

    return prisma.subject;
}

function validateId(
    id
) {

    const subjectId =
        Number(id);

    if (
        !Number.isInteger(
            subjectId
        ) ||
        subjectId <= 0
    ) {

        throw new Error(
            "Invalid subject id"
        );
    }

    return subjectId;
}

/*
====================================
GET ALL
====================================
*/

async function findAll() {

    try {

        return await getModel()
            .findMany({

                orderBy: {
                    id: "desc"
                }
            });

    } catch (error) {

        console.error(
            "SUBJECT REPOSITORY findAll:",
            error.message
        );

        throw error;
    }
}

/*
====================================
GET BY ID
====================================
*/

async function findById(
    id
) {

    try {

        return await getModel()
            .findUnique({

                where: {
                    id:
                        validateId(id)
                }
            });

    } catch (error) {

        console.error(
            "SUBJECT REPOSITORY findById:",
            error.message
        );

        throw error;
    }
}

/*
====================================
CREATE
====================================
*/

async function create(
    payload
) {

    try {

        return await getModel()
            .create({

                data:
                    payload
            });

    } catch (error) {

        console.error(
            "SUBJECT REPOSITORY create:",
            error.message
        );

        throw error;
    }
}

/*
====================================
UPDATE
====================================
*/

async function update(
    id,
    payload
) {

    try {

        return await getModel()
            .update({

                where: {
                    id:
                        validateId(id)
                },

                data:
                    payload
            });

    } catch (error) {

        console.error(
            "SUBJECT REPOSITORY update:",
            error.message
        );

        throw error;
    }
}

/*
====================================
DELETE
====================================
*/

async function remove(
    id
) {

    try {

        return await getModel()
            .delete({

                where: {
                    id:
                        validateId(id)
                }
            });

    } catch (error) {

        console.error(
            "SUBJECT REPOSITORY delete:",
            error.message
        );

        throw error;
    }
}

module.exports =
    Object.freeze({

        findAll,
        findById,

        create,
        update,
        remove
    });