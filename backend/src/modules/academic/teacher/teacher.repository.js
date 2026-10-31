"use strict";

/*
=========================================
TEACHER REPOSITORY
ENTERPRISE HARDENED
COMMONJS ONLY
=========================================
*/

const {
    prisma
} = require(
    "../../config/db"
);

/*
=========================================
MODEL RESOLUTION
=========================================
*/

function getModel() {

    try {

        if (
            !prisma ||
            !prisma.teacher
        ) {

            return null;
        }

        return prisma.teacher;

    } catch {

        return null;
    }
}

/*
=========================================
ID VALIDATION
=========================================
*/

function validateId(
    id
) {

    const teacherId =
        Number(id);

    if (
        !Number.isInteger(
            teacherId
        ) ||
        teacherId <= 0
    ) {

        return null;
    }

    return teacherId;
}

/*
=========================================
GET ALL
=========================================
*/

async function findAll() {

    try {

        const model =
            getModel();

        if (!model) {

            return [];
        }

        const result =
            await model.findMany({

                orderBy: {
                    id: "desc"
                }
            });

        return Array.isArray(
            result
        )
            ? result
            : [];

    } catch (error) {

        console.error(

            "[TEACHER REPOSITORY]",

            "findAll:",

            error.message
        );

        return [];
    }
}

/*
=========================================
GET BY ID
=========================================
*/

async function findById(
    id
) {

    try {

        const model =
            getModel();

        const teacherId =
            validateId(id);

        if (
            !model ||
            !teacherId
        ) {

            return null;
        }

        return await model.findUnique({

            where: {
                id:
                    teacherId
            }
        });

    } catch (error) {

        console.error(

            "[TEACHER REPOSITORY]",

            "findById:",

            error.message
        );

        return null;
    }
}

/*
=========================================
CREATE
=========================================
*/

async function create(
    payload = {}
) {

    try {

        const model =
            getModel();

        if (
            !model ||
            !payload ||
            typeof payload !==
                "object"
        ) {

            return null;
        }

        return await model.create({

            data:
                payload
        });

    } catch (error) {

        console.error(

            "[TEACHER REPOSITORY]",

            "create:",

            error.message
        );

        return null;
    }
}

/*
=========================================
UPDATE
=========================================
*/

async function update(
    id,
    payload = {}
) {

    try {

        const model =
            getModel();

        const teacherId =
            validateId(id);

        if (
            !model ||
            !teacherId ||
            !payload ||
            typeof payload !==
                "object"
        ) {

            return null;
        }

        return await model.update({

            where: {
                id:
                    teacherId
            },

            data:
                payload
        });

    } catch (error) {

        console.error(

            "[TEACHER REPOSITORY]",

            "update:",

            error.message
        );

        return null;
    }
}

/*
=========================================
DELETE
=========================================
*/

async function remove(
    id
) {

    try {

        const model =
            getModel();

        const teacherId =
            validateId(id);

        if (
            !model ||
            !teacherId
        ) {

            return false;
        }

        await model.delete({

            where: {
                id:
                    teacherId
            }
        });

        return true;

    } catch (error) {

        console.error(

            "[TEACHER REPOSITORY]",

            "remove:",

            error.message
        );

        return false;
    }
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        findAll,

        findById,

        create,

        update,

        remove
    });