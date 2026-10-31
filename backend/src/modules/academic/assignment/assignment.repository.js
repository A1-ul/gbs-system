"use strict";

async function findAll() {

    return [];
}

async function findById(
    id
) {

    const assignmentId =
        Number(id);

    if (
        !Number.isInteger(
            assignmentId
        ) ||
        assignmentId <= 0
    ) {

        return null;
    }

    return null;
}

module.exports =
    Object.freeze({

        findAll,

        findById
    });