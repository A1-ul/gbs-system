"use strict";

const {
    prisma
} = require("../../config/db");

if (!prisma) {

    throw new Error(
        "Prisma client unavailable"
    );
}

function getModel() {

    if (!prisma.finance) {

        throw new Error(
            "Prisma finance model unavailable"
        );
    }

    return prisma.finance;
}

function validateId(id) {

    const financeId =
        Number(id);

    if (
        !Number.isInteger(financeId) ||
        financeId <= 0
    ) {

        throw new Error(
            "Invalid finance id"
        );
    }

    return financeId;
}

function validatePayload(
    payload = {}
) {

    if (
        typeof payload !== "object" ||
        payload === null
    ) {

        throw new Error(
            "Invalid finance payload"
        );
    }

    return payload;
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
            data:
                validatePayload(
                    payload
                )
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
                validatePayload(
                    payload
                )
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