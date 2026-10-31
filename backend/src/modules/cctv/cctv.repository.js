"use strict";

async function findAll() {

    return [];
}

async function findById(
    id
) {

    if (
        !id ||
        typeof id !== "string"
    ) {

        throw new Error(
            "Invalid CCTV camera id"
        );
    }

    return null;
}

module.exports =
    Object.freeze({

        findAll,
        findById
    });