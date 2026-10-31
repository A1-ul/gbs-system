"use strict";

/*
=========================================
GBS ENTERPRISE AUDITLOG REPOSITORY
COMMONJS ONLY
CRASH RESISTANT
=========================================
*/

async function findAll() {

    try {

        return [];

    } catch (error) {

        console.error(
            "[AUDITLOG_REPOSITORY_FIND_ALL_ERROR]",
            error.message
        );

        throw error;
    }
}

async function findById(id) {

    try {

        const auditLogId =
            Number(id);

        if (
            !Number.isInteger(auditLogId) ||
            auditLogId <= 0
        ) {

            return null;
        }

        return null;

    } catch (error) {

        console.error(
            "[AUDITLOG_REPOSITORY_FIND_BY_ID_ERROR]",
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