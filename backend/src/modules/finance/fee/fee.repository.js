"use strict";

const { prisma } = require("../../config/db");

function validatePrisma() {

    if (!prisma) {
        throw new Error("Prisma client unavailable");
    }

    if (!prisma.fee) {
        throw new Error("Prisma fee model unavailable");
    }
}

function validateId(id) {

    const feeId = Number(id);

    if (
        !Number.isInteger(feeId) ||
        feeId <= 0
    ) {
        throw new Error("Invalid fee id");
    }

    return feeId;
}

async function findAll() {

    validatePrisma();

    return prisma.fee.findMany({
        orderBy: {
            id: "desc"
        }
    });
}

async function findById(id) {

    validatePrisma();

    return prisma.fee.findUnique({
        where: {
            id: validateId(id)
        }
    });
}

async function create(payload) {

    validatePrisma();

    return prisma.fee.create({
        data: payload
    });
}

async function update(id, payload) {

    validatePrisma();

    return prisma.fee.update({
        where: {
            id: validateId(id)
        },
        data: payload
    });
}

async function remove(id) {

    validatePrisma();

    return prisma.fee.delete({
        where: {
            id: validateId(id)
        }
    });
}

module.exports = Object.freeze({
    findAll,
    findById,
    create,
    update,
    remove
});