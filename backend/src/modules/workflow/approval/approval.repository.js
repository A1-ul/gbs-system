"use strict";

async function findAll() {

    return [];
}

async function findById(
    id
) {

    const approvalId =
        Number(id);

    if (
        !Number.isInteger(
            approvalId
        ) ||
        approvalId <= 0
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