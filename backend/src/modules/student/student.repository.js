"use strict";

const {
    prisma
} = require(
    "../../config/db"
);

function getModel() {

    if (
        !prisma ||
        !prisma.student
    ) {

        return null;
    }

    return prisma.student;
}

function normalizeId(
    id
) {

    const value =
        Number(id);

    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {

        return null;
    }

    return value;
}

async function findAll() {

    try {

        const model =
            getModel();

        if (!model) {

            return [];
        }

        return await model.findMany({

            orderBy: {
                id: "desc"
            }
        });

    } catch (error) {

        console.error(
            "[STUDENT REPOSITORY] FIND ALL:",
            error.message
        );

        return [];
    }
}

async function findById(
    id
) {

    try {

        const model =
            getModel();

        const studentId =
            normalizeId(id);

        if (
            !model ||
            !studentId
        ) {

            return null;
        }

        return await model.findUnique({

            where: {
                id: studentId
            }
        });

    } catch (error) {

        console.error(
            "[STUDENT REPOSITORY] FIND BY ID:",
            error.message
        );

        return null;
    }
}

async function create(
    payload = {}
) {

    try {

        const model =
            getModel();

        if (!model) {

            return null;
        }

        return await model.create({

            data: payload
        });

    } catch (error) {

        console.error(
            "[STUDENT REPOSITORY] CREATE:",
            error.message
        );

        return null;
    }
}

async function update(
    id,
    payload = {}
) {

    try {

        const model =
            getModel();

        const studentId =
            normalizeId(id);

        if (
            !model ||
            !studentId
        ) {

            return null;
        }

        return await model.update({

            where: {
                id: studentId
            },

            data: payload
        });

    } catch (error) {

        console.error(
            "[STUDENT REPOSITORY] UPDATE:",
            error.message
        );

        return null;
    }
}

async function remove(
    id
) {

    try {

        const model =
            getModel();

        const studentId =
            normalizeId(id);

        if (
            !model ||
            !studentId
        ) {

            return false;
        }

        await model.delete({

            where: {
                id: studentId
            }
        });

        return true;

    } catch (error) {

        console.error(
            "[STUDENT REPOSITORY] DELETE:",
            error.message
        );

        return false;
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