"use strict";

/*
==================================================
GBS ENTERPRISE APPLICATION REPOSITORY
COMMONJS ONLY
==================================================
*/

async function findAll() {

    return [];
}

async function findById(
    id
) {

    const applicationId =
        Number(id);

    if (
        !Number.isInteger(
            applicationId
        ) ||
        applicationId <= 0
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