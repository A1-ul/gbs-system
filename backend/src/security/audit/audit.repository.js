"use strict";

/*
=========================================
GBS ENTERPRISE AUDIT REPOSITORY
COMMONJS ONLY
CRASH RESISTANT
=========================================
*/

async function findAll() {

    try {

        return [];

    } catch (error) {

        console.error(
            "[AUDIT_REPOSITORY_FIND_ALL_ERROR]",
            error.message
        );

        throw error;
    }
}

async function findById(id) {

    try {

        const auditId =
            Number(id);

        if (
            !Number.isInteger(auditId) ||
            auditId <= 0
        ) {

            return null;
        }

        return null;

    } catch (error) {

        console.error(
            "[AUDIT_REPOSITORY_FIND_BY_ID_ERROR]",
            error.message
        );

        throw error;
    }
}

module.exports =
    Object.freeze({

        findAll,

        findById
    });