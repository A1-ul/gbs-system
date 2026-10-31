"use strict";

const {
    prisma
} = require("../../config/db");

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

function validateModel() {

    if (!prisma.grade) {

        throw new Error(
            "Prisma grade model unavailable"
        );
    }
}

function sanitizeId(id) {

    const value = Number(id);

    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {

        throw new Error(
            "Invalid grade id"
        );
    }

    return value;
}

/*
====================================
GET ALL
====================================
*/

async function findAll() {

    validateModel();

    try {

        return await prisma.grade.findMany({
            orderBy: {
                id: "desc"
            }
        });

    } catch (error) {

        console.error(
            "GRADE REPOSITORY findAll ERROR:",
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

async function findById(id) {

    validateModel();

    try {

        return await prisma.grade.findUnique({
            where: {
                id: sanitizeId(id)
            }
        });

    } catch (error) {

        console.error(
            "GRADE REPOSITORY findById ERROR:",
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

async function create(data) {

    validateModel();

    try {

        return await prisma.grade.create({
            data
        });

    } catch (error) {

        console.error(
            "GRADE REPOSITORY create ERROR:",
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

async function update(id, data) {

    validateModel();

    try {

        return await prisma.grade.update({
            where: {
                id: sanitizeId(id)
            },
            data
        });

    } catch (error) {

        console.error(
            "GRADE REPOSITORY update ERROR:",
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

async function remove(id) {

    validateModel();

    try {

        return await prisma.grade.delete({
            where: {
                id: sanitizeId(id)
            }
        });

    } catch (error) {

        console.error(
            "GRADE REPOSITORY delete ERROR:",
            error.message
        );

        throw error;
    }
}

module.exports = Object.freeze({
    findAll,
    findById,
    create,
    update,
    remove
});