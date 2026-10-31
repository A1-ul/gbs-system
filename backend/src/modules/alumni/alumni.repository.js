"use strict";

/*
====================================
ALUMNI REPOSITORY
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

async function findAll() {

    return [];
}

async function findById(
    id
) {

    const alumniId =
        Number(id);

    if (
        !Number.isInteger(
            alumniId
        ) ||
        alumniId <= 0
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