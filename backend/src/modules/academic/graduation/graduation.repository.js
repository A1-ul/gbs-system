"use strict";

const {
    prisma
} =
require("../../config/db");

if (!prisma) {

    throw new Error(
        "Prisma unavailable"
    );
}

function getModel() {

    if (!prisma.graduate) {

        throw new Error(
            "Graduate model unavailable"
        );
    }

    return prisma.graduate;
}

function validateId(id) {

    const value =
        Number(id);

    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {

        throw new Error(
            "Invalid graduate id"
        );
    }

    return value;
}

async function findAll() {

    return getModel()
        .findMany({

            orderBy: {
                id: "desc"
            }
        });
}

async function findById(id) {

    return getModel()
        .findUnique({

            where: {
                id:
                    validateId(id)
            }
        });
}

async function create(payload) {

    return getModel()
        .create({

            data: payload
        });
}

async function update(
    id,
    payload
) {

    return getModel()
        .update({

            where: {
                id:
                    validateId(id)
            },

            data:
                payload
        });
}

async function remove(id) {

    return getModel()
        .delete({

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
        update,
        remove
    });