"use strict";

const {
    prisma
} = require("../../config/db");

/*
====================================
PRISMA VALIDATION
====================================
*/

function validatePrisma() {

    if (
        !prisma ||
        !prisma.notification
    ) {

        throw new Error(
            "Prisma notification model unavailable"
        );
    }
}

/*
====================================
FIND ALL
====================================
*/

async function findAll() {

    validatePrisma();

    return prisma.notification.findMany({
        orderBy: {
            id: "desc"
        }
    });
}

/*
====================================
FIND BY ID
====================================
*/

async function findById(id) {

    validatePrisma();

    const notificationId =
        Number(id);

    if (
        !Number.isInteger(
            notificationId
        ) ||
        notificationId <= 0
    ) {

        throw new Error(
            "Invalid notification id"
        );
    }

    return prisma.notification.findUnique({
        where: {
            id: notificationId
        }
    });
}

/*
====================================
CREATE
====================================
*/

async function create(payload) {

    validatePrisma();

    if (
        !payload ||
        typeof payload !== "object"
    ) {

        throw new Error(
            "Invalid notification payload"
        );
    }

    return prisma.notification.create({
        data: payload
    });
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

    validatePrisma();

    const notificationId =
        Number(id);

    if (
        !Number.isInteger(
            notificationId
        ) ||
        notificationId <= 0
    ) {

        throw new Error(
            "Invalid notification id"
        );
    }

    return prisma.notification.update({
        where: {
            id: notificationId
        },
        data: payload
    });
}

/*
====================================
DELETE
====================================
*/

async function remove(id) {

    validatePrisma();

    const notificationId =
        Number(id);

    if (
        !Number.isInteger(
            notificationId
        ) ||
        notificationId <= 0
    ) {

        throw new Error(
            "Invalid notification id"
        );
    }

    return prisma.notification.delete({
        where: {
            id: notificationId
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